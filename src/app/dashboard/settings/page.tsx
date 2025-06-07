"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {  User, Shield, Bell, Trash2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCSRF } from "@/hooks/useCSRF";
import { useEnhancedToast } from "@/hooks/useEnhancedToast";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { csrfFetch } = useCSRF();
  const { showSuccess, showError, showWarning, profileUpdateSuccess, passwordChangeSuccess, settingsUpdateSuccess } = useEnhancedToast();
  const [profile, setProfile] = useState({
    email: user?.email || "",
  });
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    shareNotifications: true,
    securityAlerts: true,
  });
  const [isUpdating, setIsUpdating] = useState(false);  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const response = await csrfFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        profileUpdateSuccess();
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      showError(error, "Profile Update Failed");
    } finally {
      setIsUpdating(false);
    }
  };
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.new !== passwords.confirm) {
      showWarning("Password Mismatch", "New passwords don't match. Please try again.");
      return;
    }

    if (passwords.new.length < 8) {
      showWarning("Password Too Short", "New password must be at least 8 characters long.");
      return;
    }

    setIsUpdating(true);

    try {
      const response = await csrfFetch('/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        passwordChangeSuccess();
        setPasswords({ current: "", new: "", confirm: "" });
      } else {
        throw new Error(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error("Failed to change password:", error);
      showError(error, "Password Change Failed");
    } finally {
      setIsUpdating(false);
    }
  };  const handleNotificationUpdate = async (key: string, value: boolean) => {
    const updatedSettings = { ...notifications, [key]: value };
    setNotifications(updatedSettings);
    
    try {
      const response = await csrfFetch('/api/auth/notifications', {
        method: 'PUT',
        body: JSON.stringify(updatedSettings),
      });

      if (!response.ok) {
        // Revert change on error
        setNotifications(prev => ({ ...prev, [key]: !value }));
        throw new Error('Failed to update notification setting');
      } else {
        settingsUpdateSuccess("Notification preferences");
      }
    } catch (error) {
      console.error("Failed to update notification setting:", error);
      showError(error, "Settings Update Failed");
    }
  };
  const handleDeleteAccount = async () => {
    const confirmText = "DELETE";
    const userInput = prompt(
      `This action cannot be undone. All your files and data will be permanently deleted.\n\nType "${confirmText}" to confirm:`
    );
    
    if (userInput !== confirmText) {
      return;
    }

    try {
      const response = await csrfFetch('/api/auth/account', {
        method: 'DELETE',
      });

      if (response.ok) {
        showSuccess("Account Deleted", "Your account has been permanently deleted.");
        logout();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
      showError(error, "Account Deletion Failed");
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Profile Information</CardTitle>
            </div>
            <CardDescription>
              Update your account profile information
            </CardDescription>
          </CardHeader>
          <CardContent>            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Change Password</CardTitle>
            </div>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwords.current}
                    onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility("current")}
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwords.new}
                    onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility("new")}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwords.confirm}
                    onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility("confirm")}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notification Preferences</CardTitle>
            </div>
            <CardDescription>
              Manage how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Email Notifications</div>
                <div className="text-sm text-muted-foreground">
                  Receive email updates about your account
                </div>
              </div>
              <Button
                variant={notifications.emailNotifications ? "default" : "outline"}
                size="sm"
                onClick={() => handleNotificationUpdate("emailNotifications", !notifications.emailNotifications)}
              >
                {notifications.emailNotifications ? "Enabled" : "Disabled"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Share Notifications</div>
                <div className="text-sm text-muted-foreground">
                  Get notified when your files are accessed
                </div>
              </div>
              <Button
                variant={notifications.shareNotifications ? "default" : "outline"}
                size="sm"
                onClick={() => handleNotificationUpdate("shareNotifications", !notifications.shareNotifications)}
              >
                {notifications.shareNotifications ? "Enabled" : "Disabled"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Security Alerts</div>
                <div className="text-sm text-muted-foreground">
                  Important security-related notifications
                </div>
              </div>
              <Button
                variant={notifications.securityAlerts ? "default" : "outline"}
                size="sm"
                onClick={() => handleNotificationUpdate("securityAlerts", !notifications.securityAlerts)}
              >
                {notifications.securityAlerts ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </div>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Delete Account</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button variant="destructive" onClick={handleDeleteAccount}>
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
