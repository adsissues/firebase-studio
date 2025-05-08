
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
        
          
            
              
                Admin Settings
              
              Configure global settings for notifications, workflows, and forecasting.
            
          

           

               {/* Notifications Section */}
               
                  
                   {/* Low Stock Threshold */}
                   
                     
                       Low Stock Threshold
                     
                     
                        
                          
                          
                        
                        {thresholdError && (
                          
                              
                              {thresholdError}
                          
                        )}
                        
                            Global alert level (item-specific minimums override this).
                        
                     
                   
                    {/* Email Notifications */}
                    
                       
                         
                         Email Low Stock Alerts
                       
                       
                         
                         
                         aria-label="Toggle email notifications"
                         disabled={isLoading}
                       
                    
                    {/* Push Notifications (Placeholder) */}
                    
                       
                         
                         Push Notifications (Coming Soon)
                       
                       
                         
                         
                         aria-label="Toggle push notifications (disabled)"
                       
                     
                

                 {/* Workflow Section Placeholder */}
                 
                   
                       Workflows (Coming Soon)
                    
                    
                       
                         
                         Require Approval for Large Movements
                       
                       
                         
                         
                         aria-label="Toggle workflow approval"
                         disabled={isLoading}
                       
                    
                     
                         Configure automated purchase orders and approval rules later.
                     
                 

                  {/* Forecasting/Analytics Section Placeholder */}
                 
                   
                       Forecasting (Coming Soon)
                    
                    {/* Default Lead Time */}
                   
                     
                       Default Lead Time (Days)
                     
                     
                        
                          
                          
                        
                        {leadTimeError && (
                           
                               
                               {leadTimeError}
                           
                        )}
                        
                            Used for automatic reorder point calculations (item-specific times override this).
                        
                     
                   
                 

                 {/* Integrations Section Placeholder */}
                  
                     
                         Integrations (Coming Soon)
                     
                     
                         Connect with supplier portals, shipping platforms, and e-commerce later.
                     
                  


            

            

                  
                     Cancel
                  
                 Save Settings
              
            
          
        
      );
    }

