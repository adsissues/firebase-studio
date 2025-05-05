'use client';

    import * as React from 'react';
    import {
      Dialog,
      DialogContent,
      DialogHeader,
      DialogTitle,
      DialogDescription,
      DialogFooter,
      DialogClose, // Import DialogClose
    } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { Label } from '@/components/ui/label';
    import { Switch } from '@/components/ui/switch';
    import { Input } from '@/components/ui/input';
    import { Bell, Mail, Save, XCircle, AlertTriangle } from 'lucide-react'; // Import icons

    interface AdminSettingsDialogProps {
      isOpen: boolean;
      onClose: () => void;
      onSave: (settings: AdminSettings) => void;
      currentSettings?: AdminSettings; // Optional current settings to pre-populate
    }

    export interface AdminSettings {
      emailNotifications: boolean;
      pushNotifications: boolean; // Placeholder for future push notification implementation
      lowStockThreshold: number; // Threshold for low stock notifications
    }

    const defaultSettings: AdminSettings = {
      emailNotifications: true,
      pushNotifications: false, // Default push notifications to off
      lowStockThreshold: 10, // Default threshold
    };

    export function AdminSettingsDialog({
      isOpen,
      onClose,
      onSave,
      currentSettings = defaultSettings,
    }: AdminSettingsDialogProps) {
      const [emailEnabled, setEmailEnabled] = React.useState(currentSettings.emailNotifications);
      const [pushEnabled, setPushEnabled] = React.useState(currentSettings.pushNotifications);
      const [threshold, setThreshold] = React.useState(currentSettings.lowStockThreshold);
      const [thresholdError, setThresholdError] = React.useState<string | null>(null);

      // Reset state when dialog opens/closes or currentSettings change
      React.useEffect(() => {
        setEmailEnabled(currentSettings.emailNotifications);
        setPushEnabled(currentSettings.pushNotifications);
        setThreshold(currentSettings.lowStockThreshold);
        setThresholdError(null); // Reset error on open
      }, [isOpen, currentSettings]);

      const handleSave = () => {
          if (threshold <= 0) {
            setThresholdError("Low stock threshold must be a positive number.");
            return;
          }
          setThresholdError(null);
          onSave({
            emailNotifications: emailEnabled,
            pushNotifications: pushEnabled,
            lowStockThreshold: threshold,
          });
          // onClose(); // Consider closing only after successful save confirmed by parent
      };

      const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const value = parseInt(e.target.value, 10);
           // Allow empty input temporarily, but validate on save
          if (isNaN(value)) {
              setThreshold(0); // Or handle empty string case if needed
          } else {
              setThreshold(value);
          }
          // Clear error on change
           if (thresholdError && value > 0) {
             setThresholdError(null);
           }
      };

      return (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Admin Notification Settings</DialogTitle>
              <DialogDescription>
                Configure how and when notifications are sent for low stock alerts.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
               {/* Low Stock Threshold */}
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="low-stock-threshold" className="col-span-1 text-right">
                   Low Stock Threshold
                 </Label>
                 <div className="col-span-3 space-y-1">
                    <Input
                      id="low-stock-threshold"
                      type="number"
                      min="1" // Ensure positive input in browser
                      step="1"
                      value={threshold}
                      onChange={handleThresholdChange}
                      className={`w-24 ${thresholdError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {thresholdError && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {thresholdError}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Notify when stock drops to this level or below.
                    </p>
                 </div>
               </div>

              {/* Email Notifications */}
              <div className="flex items-center justify-between space-x-4 rounded-md border p-4">
                <div className="flex items-center space-x-3">
                   <Mail className="h-5 w-5 text-primary" />
                   <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
                     <span>Email Notifications</span>
                     <span className="font-normal leading-snug text-muted-foreground">
                       Receive email alerts for low stock items.
                     </span>
                   </Label>
                 </div>
                <Switch
                  id="email-notifications"
                  checked={emailEnabled}
                  onCheckedChange={setEmailEnabled}
                  aria-label="Toggle email notifications"
                />
              </div>

              {/* Push Notifications (Placeholder) */}
              <div className="flex items-center justify-between space-x-4 rounded-md border p-4 opacity-50 cursor-not-allowed">
                 <div className="flex items-center space-x-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <Label htmlFor="push-notifications" className="flex flex-col space-y-1">
                      <span>Push Notifications</span>
                      <span className="font-normal leading-snug text-muted-foreground">
                         (Coming soon) Receive push alerts via browser/app.
                      </span>
                    </Label>
                  </div>
                 <Switch
                   id="push-notifications"
                   checked={pushEnabled}
                   onCheckedChange={setPushEnabled}
                   disabled // Disable push notifications for now
                   aria-label="Toggle push notifications (disabled)"
                 />
               </div>
            </div>

            <DialogFooter className="sm:justify-end">
              <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={onClose}>
                     <XCircle className="mr-2 h-4 w-4" /> Cancel
                  </Button>
              </DialogClose>
              <Button type="button" onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" /> Save Settings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }
    