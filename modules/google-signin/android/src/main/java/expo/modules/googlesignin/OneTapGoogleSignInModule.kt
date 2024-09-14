package expo.modules.googlesignin

import android.app.Activity
import android.content.Intent
import android.content.IntentSender
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.Credential
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.ClearCredentialException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.Scope
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import com.google.api.client.http.ByteArrayContent
import com.google.api.client.http.javanet.NetHttpTransport
import com.google.api.client.json.gson.GsonFactory
import com.google.api.services.drive.Drive
import com.google.api.services.drive.DriveScopes
import com.google.api.services.drive.model.File
import com.google.api.services.drive.model.FileList
import com.google.auth.http.HttpCredentialsAdapter
import com.google.auth.oauth2.AccessToken
import com.google.auth.oauth2.GoogleCredentials
import expo.modules.kotlin.events.OnActivityResultPayload
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.util.Collections

class OneTapGoogleSignInModule : Module() {
    private lateinit var coroutineScope: CoroutineScope
    private lateinit var credentialManager: CredentialManager

    @Volatile
    private var deferredUploadData: String? = null

    override fun definition() = ModuleDefinition {
        Name("OneTapGoogleSignIn")

        OnCreate {
            credentialManager = CredentialManager.create(appContext.reactContext!!)
            coroutineScope = CoroutineScope(Dispatchers.Main)
        }

        AsyncFunction("signIn") { clientId: String ->
            coroutineScope.launch {
                try {
                    signIn(clientId)
                } catch (e: Exception) {
                    signUp(clientId)
                }
            }
        }

        AsyncFunction("signOut") {
            coroutineScope.launch {
                signOut()
            }
        }

        AsyncFunction("syncSigningKey") { data: String -> 
            deferredUploadData = data
            requestDriveAuthorization()
        }

        Events(
            "onSignIn",
            "onSignOut",
            "onConfigReceived",
            "onConfigError",
            "onAuthorizationError"
        )

        OnActivityResult { activity: Activity, payload: OnActivityResultPayload ->
            onActivityResult(activity, payload.requestCode, payload.data)
        }
    }

    private suspend fun signIn(clientId: String) {
        val googleIdOption = GetGoogleIdOption.Builder()
            .setServerClientId(clientId)
            .setFilterByAuthorizedAccounts(true)
            .setAutoSelectEnabled(true)
            .build()
        
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        return try {
            val result = credentialManager.getCredential(appContext.currentActivity!!, request)
            val response = handleSignInResult(result)
            sendEvent("onSignIn", response)
        } catch (e: GetCredentialException) {
            val response = mapOf("error" to (e.message ?: "Unknown error occurred during sign-in"))
            if (response["error"].equals("No credentials available")) {
                throw Exception("User has not signed up")
            } else {
                sendEvent("onSignIn", response)
            }
        }
    }

    private suspend fun signUp(clientId: String) {
        val googleIdOption = GetGoogleIdOption.Builder()
            .setServerClientId(clientId)
            .setFilterByAuthorizedAccounts(false)
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        return try {
            val result = credentialManager.getCredential(appContext.currentActivity!!, request)
            val response = handleSignInResult(result)
            sendEvent("onSignIn", response)
        } catch (e: GetCredentialException) {
            val response = mapOf("error" to (e.message ?: "Unknown error occurred during sign-up"))
            sendEvent("onSignIn", response)
        }
    }

    private suspend fun signOut() {
        val request = ClearCredentialStateRequest()

        try {
            credentialManager.clearCredentialState(request)
            sendEvent("onSignOut", mapOf("success" to true))
        } catch (e: ClearCredentialException) {
            sendEvent("onSignOut", mapOf("error" to (e.message ?: "Unknown error occurred during sign-out")))
        }
    }

    private fun handleSignInResult(result: GetCredentialResponse): Map<String, Any> {
        return when (val credential: Credential = result.credential) {
            is CustomCredential -> {
                if (credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    try {
                        val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                        mapOf(
                            "success" to "true",
                            "idToken" to googleIdTokenCredential.idToken,
                            "displayName" to (googleIdTokenCredential.displayName ?: ""),
                            "userId" to googleIdTokenCredential.id,
                            "photoUrl" to (googleIdTokenCredential.profilePictureUri?.toString() ?: "")
                        )
                    } catch (e: GoogleIdTokenParsingException) {
                        mapOf("error" to "Received an invalid google id token response")
                    }
                } else {
                    mapOf("error" to "Unexpected type of credential")
                }
            }

            else -> mapOf("error" to "Unexpected type of credential")
        }
    }

    private fun requestDriveAuthorization() {
        try {
            val requestedScopes = listOf(Scope(DriveScopes.DRIVE_APPDATA))
            val authorizationRequest = AuthorizationRequest.Builder()
                .setRequestedScopes(requestedScopes)
                .build()

            Identity.getAuthorizationClient(appContext.currentActivity!!)
                .authorize(authorizationRequest)
                .addOnSuccessListener { authorizationResult ->
                    if (authorizationResult.hasResolution()) {
                        val pendingIntent = authorizationResult.pendingIntent
                        try {
                            appContext.currentActivity!!.startIntentSenderForResult(
                                pendingIntent!!.intentSender,
                                REQUEST_AUTHORIZE,
                                null,
                                0,
                                0,
                                0,
                                null
                            )
                        } catch (e: IntentSender.SendIntentException) {
                            sendEvent(
                                "onAuthorizationError",
                                mapOf(
                                    "error" to "Couldn't start Authorization UI",
                                    "message" to e.localizedMessage
                                )
                            )
                        }
                    } else {
                        coroutineScope.launch {
                            getAppData(authorizationResult)
                        }
                    }
                }
                .addOnFailureListener { e ->
                    sendEvent(
                        "onAuthorizationError",
                        mapOf("error" to "Failed to authorize", "message" to e.localizedMessage)
                    )
                }
        } catch (e: Exception) {
            sendEvent(
                "onAuthorizationError",
                mapOf("error" to "Unknown Error", "message" to e.localizedMessage)
            )
        }
    }

    private suspend fun getAppData(authorizationResult: AuthorizationResult) {
        val credentials = GoogleCredentials.create(AccessToken(authorizationResult.accessToken, null))

        val service = Drive.Builder(
            NetHttpTransport(),
            GsonFactory.getDefaultInstance(),
            HttpCredentialsAdapter(credentials)
        ).setApplicationName(APPLICATION_NAME).build()

        withContext(Dispatchers.IO) {
            val folder: FileList
            try {
                folder = service.files()
                    .list()
                    .setSpaces("appDataFolder")
                    .setFields("nextPageToken, files(id, name)")
                    .execute()
            } catch (e: IOException) {
                sendEvent("onConfigError", mapOf("error" to "Unable to fetch appdata files", "message" to e.localizedMessage))
                return@withContext
            }

            if (folder.files.isNotEmpty()) {
                val file = folder.files.first()
                val outputStream = ByteArrayOutputStream()
                try {
                    service.files()
                        .get(file.id)
                        .executeMediaAndDownloadTo(outputStream)
                    sendEvent("onConfigReceived", mapOf("config" to outputStream.toString("UTF-8")))
                } catch (e: IOException) {
                    sendEvent("onConfigError", mapOf("error" to "Unable to get config file", "message" to e.localizedMessage))
                }
                outputStream.close()
            } else {
                sendEvent("onConfigReceived", mapOf("config" to deferredUploadData))
            }
        }
    }

    private fun onActivityResult(activity: Activity, requestCode: Int, data: Intent?) {
        if (requestCode == REQUEST_AUTHORIZE) {
            val authorizationResult = Identity.getAuthorizationClient(activity)
                .getAuthorizationResultFromIntent(data)
            coroutineScope.launch {
                createAppData(authorizationResult)
            }
        }
    }

    private suspend fun createAppData(authorizationResult: AuthorizationResult) {
        val credentials = GoogleCredentials.create(AccessToken(authorizationResult.accessToken, null))
        val service = Drive.Builder(
            NetHttpTransport(),
            GsonFactory(),
            HttpCredentialsAdapter(credentials)
        ).setApplicationName(APPLICATION_NAME).build()

        withContext(Dispatchers.IO) {
            val fileMetadata = File()
            fileMetadata.name = FILE_METADATA_NAME
            fileMetadata.parents = Collections.singletonList("appDataFolder")
            val config = deferredUploadData ?: ""

            try {
                if (config.isNotEmpty()) {
                    val mediaContent = ByteArrayContent.fromString("application/json", config)
                    service.files()
                        .create(fileMetadata, mediaContent)
                        .setFields("id")
                        .execute()
                    sendEvent("onConfigReceived", mapOf("config" to config))
                } else {
                    sendEvent("onConfigError", mapOf("error" to "No config to sync"))
                }
            } catch (e: IOException) {
                sendEvent("onConfigError", mapOf("error" to "Unable to sync config", "message" to e.localizedMessage))
            }
        }
    }

    companion object {
        const val REQUEST_AUTHORIZE = 1001
        const val FILE_METADATA_NAME = "config.json"
        const val APPLICATION_NAME = "space_variance_origin_config"
    }
}