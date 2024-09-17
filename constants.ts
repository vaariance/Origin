export const NAV_THEME = {
  light: {
    background: "#FFFFFF", // background
    border: "#E5E7EB", // border
    card: "#FFFFFF", // card
    notification: "#EF4444", // destructive
    primary: "#7C3AED", // primary
    text: "#030712", // foreground
    secondary: "#f3f4f6",
    success: "#5fd65d",
  },
  dark: {
    background: "#030712", // background
    border: "#1F2937", // border
    card: "#030712", // card
    notification: "#7F1D1D", // destructive
    primary: "#6D28D9", // primary
    text: "#F9FAFB", // foreground
    secondary: "#1f2937",
    success: "#207b1f",
  },
};

export const NavTheme = {
  ["light"]: { dark: false, colors: NAV_THEME.light },
  ["dark"]: { dark: true, colors: NAV_THEME.dark },
};

export enum Action {
  Send = "SEND",
  Receive = "RECEIVE",
  Buy = "BUY",
  Sell = "SELL",
}
