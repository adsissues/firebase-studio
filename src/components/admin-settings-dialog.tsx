
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
    import { Bell, Mail, Save, XCircle, AlertTriangle, Loader2, Settings2, Bot, CheckSquare, ClockIcon } from 'lucide-react'; // Added icons
    import type { AdminSettings } from '@/types'; // Import updated type

    interface AdminSettingsDialogProps {
      isOpen: boolean;
      onClose: () => void;
      onSave: (settings: AdminSettings) => void;
      currentSettings?: AdminSettings;
      isLoading?: boolean;
    }

    // Use the default values defined in the main page, passed via currentSettings
    const defaultSettings: AdminSettings = {
      emailNotifications: true,
      pushNotifications: false,
      lowStockThreshold: 10,
      workflowApprovalRequired: false,
      defaultLeadTime: 7,
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
      // State for new settings placeholders
      const [workflowApproval, setWorkflowApproval] = React.useState(currentSettings.workflowApprovalRequired ?? false);
      const [defaultLeadTime, setDefaultLeadTime] = React.useState(currentSettings.defaultLeadTime ?? 7);
      const [leadTimeError, setLeadTimeError] = React.useState<string | null>(null);


      React.useEffect(() => {
        setEmailEnabled(currentSettings.emailNotifications);
        setPushEnabled(currentSettings.pushNotifications);
        setThreshold(currentSettings.lowStockThreshold);
        setWorkflowApproval(currentSettings.workflowApprovalRequired ?? false);
        setDefaultLeadTime(currentSettings.defaultLeadTime ?? 7);
        setThresholdError(null);
        setLeadTimeError(null);
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

           if (defaultLeadTime < 0) {
             setLeadTimeError("Default lead time cannot be negative.");
             hasError = true;
           } else {
              setLeadTimeError(null);
           }

          if (hasError) return;

          onSave({
            emailNotifications: emailEnabled,
            pushNotifications: pushEnabled,
            lowStockThreshold: threshold,
            workflowApprovalRequired: workflowApproval, // Save new settings
            defaultLeadTime: defaultLeadTime,
          });
      };

      const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const value = parseInt(e.target.value, 10);
          if (isNaN(value)) {
              setThreshold(0);
          } else {
              setThreshold(value);
          }
           if (thresholdError && value > 0) {
             setThresholdError(null);
           }
      };

      const handleLeadTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const value = parseInt(e.target.value, 10);
           if (isNaN(value)) {
               setDefaultLeadTime(0);
           } else {
               setDefaultLeadTime(value);
           }
            if (leadTimeError && value >= 0) {
              setLeadTimeError(null);
            }
       };


      return (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Admin Settings</DialogTitle>
              <DialogDescription>
                Configure global settings for notifications, workflows, and forecasting.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4 max-h-[65vh] overflow-y-auto pr-2">
               {/* Notifications Section */}
               <div className="space-y-4 border p-4 rounded-md">
                   <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><Bell className="h-5 w-5"/>Notifications</h3>
                   {/* Low Stock Threshold */}
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
                    {/* Email Notifications */}
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
                    {/* Push Notifications (Placeholder) */}
                    <div className="flex items-center justify-between space-x-2 opacity-50">
                      <Label htmlFor="push-notifications" className="flex items-center gap-2">
                        <Bell className="h-4 w-4"/> Push Notifications (Coming Soon)
                      </Label>
                      <Switch
                        id="push-notifications"
                        checked={pushEnabled}
                        onCheckedChange={setPushEnabled}
                        disabled={true} // Placeholder
                        aria-label="Toggle push notifications (disabled)"
                      />
                     </div>
                </div>

                 {/* Workflow Section Placeholder */}
                 <div className="space-y-4 border p-4 rounded-md opacity-50">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><Bot className="h-5 w-5"/>Workflows (Coming Soon)</h3>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="workflow-approval" className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4"/> Require Approval for Large Movements
                      </Label>
                      <Switch
                        id="workflow-approval"
                        checked={workflowApproval}
                        onCheckedChange={setWorkflowApproval}
                        disabled={true} // Placeholder
                        aria-label="Toggle workflow approval"
                      />
                    </div>
                     <p className="text-xs text-muted-foreground">
                         Configure automated purchase orders and approval rules later.
                     </p>
                 </div>

                  {/* Forecasting/Analytics Section Placeholder */}
                 <div className="space-y-4 border p-4 rounded-md opacity-50">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><ClockIcon className="h-5 w-5"/>Forecasting (Coming Soon)</h3>
                    {/* Default Lead Time */}
                   <div className="space-y-1">
                     <Label htmlFor="default-lead-time" className="text-sm font-medium">
                       Default Lead Time (Days)
                     </Label>
                     <Input
                        id="default-lead-time"
                        type="number"
                        value={defaultLeadTime}
                        onChange={handleLeadTimeChange}
                        className={leadTimeError ? 'border-destructive' : ''}
                        min="0"
                        step="1"
                        disabled={true} // Placeholder
                      />
                      {leadTimeError && (
                         <p className="text-xs text-destructive flex items-center gap-1">
                             <AlertTriangle className="h-3 w-3"/>{leadTimeError}
                         </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                          Used for automatic reorder point calculations (item-specific times override this).
                      </p>
                   </div>
                 </div>

                 {/* Integrations Section Placeholder */}
                  <div className="space-y-4 border p-4 rounded-md opacity-50">
                     <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><Settings2 className="h-5 w-5"/>Integrations (Coming Soon)</h3>
                     <p className="text-xs text-muted-foreground">
                         Connect with supplier portals, shipping platforms, and e-commerce later.
                     </p>
                  </div>

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

