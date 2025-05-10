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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase/firebase';
import { collection, getDocs, doc, updateDoc, DocumentData } from 'firebase/firestore';
import type { AppUser, StockItem } from '@/types';
import { Loader2, Save, XCircle, Users, ShieldCheck, User as UserIconLucide, Info, MapPin } from 'lucide-react'; 
import { Skeleton } from './ui/skeleton';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';


interface UserManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  allStockItems: StockItem[]; // Pass all stock items to extract unique locations
}

interface UserWithPotentialChanges extends AppUser {
  newRole?: 'admin' | 'user';
  newAssignedLocations?: string[];
}

async function fetchUsers(): Promise<AppUser[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const usersCol = collection(db, 'users');
  const userSnapshot = await getDocs(usersCol);
  const usersList = userSnapshot.docs.map(docData => ({ 
    uid: docData.id, 
    ...docData.data(),
    assignedLocations: docData.data().assignedLocations || [], // Ensure assignedLocations is an array
  } as AppUser));
  return usersList;
}

async function updateUser(userId: string, data: Partial<AppUser>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const userDocRef = doc(db, 'users', userId);
  await updateDoc(userDocRef, data);
}

export function UserManagementDialog({ isOpen, onClose, allStockItems }: UserManagementDialogProps) {
  const { toast } = useToast();
  const queryClientTanstack = useQueryClient(); 

  const { data: users = [], isLoading: isLoadingUsers, error: fetchUsersError } = useQuery<AppUser[]>({
    queryKey: ['allUsers'],
    queryFn: fetchUsers,
    enabled: isOpen, 
  });

  const [userChanges, setUserChanges] = React.useState<Record<string, Partial<Pick<UserWithPotentialChanges, 'newRole' | 'newAssignedLocations'>>>>({});

  const uniqueLocations = React.useMemo(() => {
    const locations = new Set<string>();
    allStockItems.forEach(item => {
      if (item.location) locations.add(item.location);
    });
    return Array.from(locations).sort();
  }, [allStockItems]);


  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<AppUser> }) => updateUser(userId, data),
    onSuccess: (_, variables) => {
      toast({
        title: 'User Updated',
        description: `User details updated successfully for user ID: ${variables.userId}.`,
      });
      queryClientTanstack.invalidateQueries({ queryKey: ['allUsers'] });
      setUserChanges(prev => {
        const updated = {...prev};
        delete updated[variables.userId];
        return updated;
      });
    },
    onError: (error: any, variables) => {
      toast({
        variant: 'destructive',
        title: 'Error Updating User',
        description: error.message || `Could not update user ID: ${variables.userId}.`,
      });
    },
  });

  const handleRoleChange = (userId: string, newRole: 'admin' | 'user') => {
    setUserChanges(prev => ({ 
        ...prev, 
        [userId]: { ...prev[userId], newRole } 
    }));
  };

  const handleLocationAssignmentChange = (userId: string, location: string) => {
    setUserChanges(prev => {
        const currentUserChanges = prev[userId] || {};
        const currentAssigned = currentUserChanges.newAssignedLocations || users.find(u=>u.uid === userId)?.assignedLocations || [];
        const newAssigned = currentAssigned.includes(location)
            ? currentAssigned.filter(l => l !== location)
            : [...currentAssigned, location];
        return {
            ...prev,
            [userId]: { ...currentUserChanges, newAssignedLocations: newAssigned }
        };
    });
  };


  const handleSaveChanges = (userId: string) => {
    const changes = userChanges[userId];
    const originalUser = users.find(u => u.uid === userId);
    if (!changes || !originalUser) return;

    const updatePayload: Partial<AppUser> = {};
    let payloadHasChanges = false; // Renamed from hasChanges to avoid conflict

    if (changes.newRole && changes.newRole !== originalUser.role) {
        updatePayload.role = changes.newRole;
        payloadHasChanges = true;
    }
    if (changes.newAssignedLocations && 
        JSON.stringify(changes.newAssignedLocations.sort()) !== JSON.stringify((originalUser.assignedLocations || []).sort())) {
        updatePayload.assignedLocations = changes.newAssignedLocations;
        payloadHasChanges = true;
    }

    if (payloadHasChanges) {
        updateUserMutation.mutate({ userId, data: updatePayload });
    } else {
        toast({title: "No Change", description: "Selected values are the same as current."});
        // Optionally clear changes if no actual difference, to reset save button
        setUserChanges(prev => {
            const updated = {...prev};
            delete updated[userId];
            return updated;
        });
    }
  };
  
  React.useEffect(() => {
    if (!isOpen) {
        setUserChanges({}); 
    }
  }, [isOpen]);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-6 w-6" /> User Management</DialogTitle>
          <DialogDescription>
            Assign roles and locations to users. Users access stock items they own or items in their assigned locations.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="mt-4 mb-2">
          <Info className="h-4 w-4" />
          <AlertTitle className="font-semibold">Adding New Users</AlertTitle>
          <ShadAlertDescription className="text-xs">
            To add a new user to the system:
            <ol className="list-decimal list-inside pl-2 mt-1 space-y-0.5">
              <li>Go to the Firebase Console &gt; Authentication section and click "Add user". Provide their email and a password. Note the **User UID**.</li>
              <li>Go to Firebase Console &gt; Firestore Database &gt; `users` collection. Click "Add document".</li>
              <li>For the **Document ID**, enter the **User UID** from step 1.</li>
              <li>Add a field named `role` (string, e.g., `user` or `admin`) and `assignedLocations` (array of strings). You can also add `email`, `displayName`, etc.</li>
            </ol>
            Once these steps are completed, the user will appear in this list after their first login or a page refresh.
          </ShadAlertDescription>
        </Alert>


        {isLoadingUsers && (
            <div className="space-y-2 py-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        )}
        {fetchUsersError && (
            <div className="text-destructive py-4">Error fetching users: {(fetchUsersError as Error).message}</div>
        )}

        {!isLoadingUsers && !fetchUsersError && users.length > 0 && (
          <div className="flex-grow overflow-y-auto pr-2 mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead className="w-[150px]">New Role</TableHead>
                  <TableHead>Assigned Locations</TableHead>
                  <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const currentRoleInState = userChanges[user.uid]?.newRole || user.role || 'user';
                  const currentAssignedLocationsInState = userChanges[user.uid]?.newAssignedLocations || user.assignedLocations || [];
                  const isSavingThisUser = updateUserMutation.isPending && updateUserMutation.variables?.userId === user.uid;
                  
                  const roleActuallyChanged = userChanges[user.uid]?.newRole && userChanges[user.uid]?.newRole !== user.role;
                  const locationsActuallyChanged = userChanges[user.uid]?.newAssignedLocations && 
                        JSON.stringify(userChanges[user.uid]?.newAssignedLocations?.sort()) !== JSON.stringify((user.assignedLocations || []).sort());
                  const hasPendingChanges = !!(roleActuallyChanged || locationsActuallyChanged);


                  return (
                  <TableRow key={user.uid}>
                    <TableCell>{user.email || 'N/A (UID: ' + user.uid.substring(0,8) + '...)'}</TableCell>
                    <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                            {user.role === 'admin' ? <ShieldCheck className="mr-1 h-3 w-3"/> : <UserIconLucide className="mr-1 h-3 w-3"/>}
                            {user.role || 'user'}
                        </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentRoleInState}
                        onValueChange={(newRole) => handleRoleChange(user.uid, newRole as 'admin' | 'user')}
                        disabled={isSavingThisUser}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 w-full justify-start text-left font-normal" disabled={isSavingThisUser}>
                                    <MapPin className="mr-2 h-4 w-4" />
                                    {currentAssignedLocationsInState.length > 0 ? `${currentAssignedLocationsInState.length} selected` : "Assign Locations"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <ScrollArea className="h-[200px] p-2">
                                 {uniqueLocations.length > 0 ? uniqueLocations.map(location => (
                                    <div key={location} className="flex items-center space-x-2 p-1.5">
                                        <Checkbox
                                            id={`${user.uid}-loc-${location}`}
                                            checked={currentAssignedLocationsInState.includes(location)}
                                            onCheckedChange={() => handleLocationAssignmentChange(user.uid, location)}
                                        />
                                        <label htmlFor={`${user.uid}-loc-${location}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {location}
                                        </label>
                                    </div>
                                )) : <p className="text-xs text-muted-foreground p-2">No locations defined in stock items yet.</p>}
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleSaveChanges(user.uid)}
                            disabled={!hasPendingChanges || isSavingThisUser}
                            title="Save changes for this user"
                        >
                            {isSavingThisUser ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                        </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
         {!isLoadingUsers && !fetchUsersError && users.length === 0 && (
            <p className="py-4 text-center text-muted-foreground">No users found in Firestore `users` collection.</p>
         )}

        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={updateUserMutation.isPending}><XCircle className="mr-2 h-4 w-4" /> Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

