'use client';

    import * as React from 'react';
    import {
      Dialog,
      DialogContent,
      DialogHeader,
      DialogTitle,
      DialogDescription,
      DialogFooter,
      DialogClose,
    } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { Label } from '@/components/ui/label';
    import { Switch } from '@/components/ui/switch';
    import { Input } from '@/components/ui/input';
    import { Bell, Mail, Save, XCircle, AlertTriangle, Loader2 } from 'lucide-react'; 
    import type { AdminSettings } from '@/types'; 

    interface AdminSettingsDialogProps {
      isOpen: boolean;
      onClose: () => void;
      onSave: (settings: AdminSettings) => void;
      currentSettings?: AdminSettings;
      isLoading?: boolean;
    }

    const defaultSettings: AdminSettings = {
      emailNotifications: true,
      pushNotifications: false,
      lowStockThreshold: 10,
      // workflowApprovalRequired and defaultLeadTime are not actively used in UI anymore
    };

    export function AdminSettingsDialog({
      isOpen,
      onClose,
      onSave,
      currentSettings = defaultSettings,
      isLoading = false,
    }: AdminSettingsDialogProps) {
      const [emailEnabled, setEmailEnabled] = React.useState(currentSettings.emailNotifications);
      const [pushEnabled, setPushEnabled] = React.useState(currentSettings.pushNotifications);
      const [threshold, setThreshold] = React.useState(currentSettings.lowStockThreshold);
      const [thresholdError, setThresholdError] = React.useState<string | null>(null);
      // Removed state for workflowApproval and defaultLeadTime

      React.useEffect(() => {
        setEmailEnabled(currentSettings.emailNotifications);
        setPushEnabled(currentSettings.pushNotifications);
        setThreshold(currentSettings.lowStockThreshold);
        // Removed state updates for deprecated settings
        setThresholdError(null);
      }, [isOpen, currentSettings]);

      const handleSave = () => {
          if (isLoading) return;

          let hasError = false;
          if (threshold <= 0) {
            setThresholdError("Low stock threshold must be a positive number.");
            hasError = true;
          } else {
             setThresholdError(null);
          }

          if (hasError) return;

          onSave({
            emailNotifications: emailEnabled,
            pushNotifications: pushEnabled,
            lowStockThreshold: threshold,
            // Deprecated fields are not saved from UI
          });
      };

      const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const value = parseInt(e.target.value, 10);
          if (isNaN(value)) {
              setThreshold(0); // Or currentSettings.lowStockThreshold
          } else {
              setThreshold(value);
          }
           if (thresholdError && value > 0) {
             setThresholdError(null);
           }
      };


      return (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Admin Settings</DialogTitle>
              <DialogDescription>
                Configure global settings for notifications and stock alerts.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4 max-h-[65vh] overflow-y-auto pr-2">
               <div className="space-y-4 border p-4 rounded-md">
                   <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><Bell className="h-5 w-5"/>Notifications & Alerts</h3>
                   <div className="space-y-1">
                     <Label htmlFor="low-stock-threshold" className="text-sm font-medium">
                       Low Stock Threshold
                     </Label>
                     <Input
                        id="low-stock-threshold"
                        type="number"
                        value={threshold}
                        onChange={handleThresholdChange}
                        className={thresholdError ? 'border-destructive' : ''}
                        min="1"
                        step="1"
                        disabled={isLoading}
                      />
                      {thresholdError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3"/>{thresholdError}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                          Global alert level (item-specific minimums override this).
                      </p>
                   </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="email-notifications" className="flex items-center gap-2">
                        <Mail className="h-4 w-4"/> Email Low Stock Alerts
                      </Label>
                      <Switch
                        id="email-notifications"
                        checked={emailEnabled}
                        onCheckedChange={setEmailEnabled}
                        aria-label="Toggle email notifications"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2 opacity-50">
                      <Label htmlFor="push-notifications" className="flex items-center gap-2">
                        <Bell className="h-4 w-4"/> Push Notifications (Coming Soon)
                      </Label>
                      <Switch
                        id="push-notifications"
                        checked={pushEnabled}
                        onCheckedChange={setPushEnabled}
                        disabled={true} 
                        aria-label="Toggle push notifications (disabled)"
                      />
                     </div>
                </div>

                 {/* Sections for Workflow and Forecasting/Analytics removed as per request */}

            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" onClick={onClose} disabled={isLoading}>
                  <XCircle className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </DialogClose>
              <Button type="button" onClick={handleSave} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Settings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    