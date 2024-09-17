import { toast } from "sonner-native";

export enum ToastType {
  Success = "lettuce",
  Error = "tomato",
  Warning = "orange",
}

type ToastParams = {
  text1: string;
  text2?: string;
  type: ToastType;
};

export class Toast {
  static show(props: ToastParams) {
    switch (props.type) {
      case ToastType.Success:
        toast.success(props.text1, {
          className: "bg-success backdrop-blur-sm",
          classNames: {
            title: "font-poppins-semibold",
            description: "font-poppins-regular",
          },
          description: props.text2,
          duration: 6000,
        });
        break;
      case ToastType.Error:
        toast.error(props.text1, {
          className: "bg-destructive backdrop-blur-sm",
          classNames: {
            title: "font-poppins-semibold",
            description: "font-poppins-regular",
          },
          description: props.text2,
          duration: 6000,
        });
        break;
      case ToastType.Warning:
        toast.warning(props.text1, {
          className: "bg-secondary backdrop-blur-sm",
          classNames: {
            title: "font-poppins-semibold",
            description: "font-poppins-regular",
          },
          description: props.text2,
          duration: 6000,
        });
        break;
      default:
        toast(props.text1, {
          classNames: {
            title: "font-poppins-semibold",
            description: "font-poppins-regular",
          },
          description: props.text2,
        });
        break;
    }
  }
}
