// Enhanced toast hook with error handling and predefined messages
import { useToast as useBaseToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "warning" | "info" | "loading";
  duration?: number;
}

export function useEnhancedToast() {
  const { toast } = useBaseToast();

  const showToast = (options: ToastOptions) => {
    toast({
      title: options.title,
      description: options.description,
      variant: options.variant || "default",
      duration: options.duration,
    });
  };

  const showSuccess = (title: string, description?: string) => {
    showToast({
      title,
      description,
      variant: "success",
      duration: 4000,
    });
  };

  const showError = (error: any, title?: string) => {
    const errorMessage = getErrorMessage(error);
    showToast({
      title: title || "Error",
      description: errorMessage,
      variant: "destructive",
      duration: 6000,
    });
  };

  const showWarning = (title: string, description?: string) => {
    showToast({
      title,
      description,
      variant: "warning",
      duration: 5000,
    });
  };

  const showInfo = (title: string, description?: string) => {
    showToast({
      title,
      description,
      variant: "info",
      duration: 4000,
    });
  };

  const showLoading = (title: string, description?: string) => {
    showToast({
      title,
      description,
      variant: "loading",
      duration: Infinity, // Keep showing until manually dismissed
    });
  };

  // Predefined toasts for common operations
  const fileUploadSuccess = (fileName: string) => {
    showSuccess(
      "File uploaded successfully!",
      `${fileName} has been encrypted and is ready to share.`
    );
  };

  const fileUploadError = (error: any, fileName?: string) => {
    showError(
      error,
      `Failed to upload ${fileName || 'file'}`
    );
  };

  const fileCopySuccess = () => {
    showSuccess(
      "Link copied!",
      "Share link has been copied to your clipboard."
    );
  };

  const fileDeleteSuccess = (fileName: string) => {
    showSuccess(
      "File deleted",
      `${fileName} has been permanently deleted.`
    );
  };

  const passwordChangeSuccess = () => {
    showSuccess(
      "Password changed",
      "Your password has been updated successfully."
    );
  };

  const profileUpdateSuccess = () => {
    showSuccess(
      "Profile updated",
      "Your profile information has been saved."
    );
  };

  const settingsUpdateSuccess = (setting: string) => {
    showSuccess(
      "Settings updated",
      `${setting} has been updated successfully.`
    );
  };

  const networkError = () => {
    showError(
      "Network error occurred. Please check your connection and try again.",
      "Connection Error"
    );
  };

  const rateLimitError = () => {
    showWarning(
      "Rate limit exceeded",
      "You're making requests too quickly. Please wait a moment before trying again."
    );
  };

  const sessionExpired = () => {
    showWarning(
      "Session expired",
      "Your session has expired. Please log in again."
    );
  };

  const featureComingSoon = (feature: string) => {
    showInfo(
      "Coming soon!",
      `${feature} will be available in a future update.`
    );
  };

  const maintenanceMode = () => {
    showWarning(
      "Maintenance mode",
      "This feature is temporarily unavailable for maintenance."
    );
  };

  return {
    // Basic toast functions
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    
    // Predefined toasts
    fileUploadSuccess,
    fileUploadError,
    fileCopySuccess,
    fileDeleteSuccess,
    passwordChangeSuccess,
    profileUpdateSuccess,
    settingsUpdateSuccess,
    networkError,
    rateLimitError,
    sessionExpired,
    featureComingSoon,
    maintenanceMode,
  };
}
