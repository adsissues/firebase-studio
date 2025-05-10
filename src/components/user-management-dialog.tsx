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
import type { AppUser } from '@/types';
import { Loader2, Save, XCircle, Users, ShieldCheck, User as UserIconLucide, Info } from 'lucide-react'; // Added UserIconLucide
import { Skeleton } from './ui/skeleton';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";


interface UserManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserWithPotentialChanges extends AppUser {
  newRole?: 'admin' | 'user';
}

async function fetchUsers(): Promise<AppUser[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const usersCol = collection(db, 'users');
  const userSnapshot = await getDocs(usersCol);
  const usersList = userSnapshot.docs.map(docData => ({ // Renamed doc to docData to avoid conflict
    uid: docData.id, // Use docData.id as uid
    ...docData.data(),
  } as AppUser));
  return usersList;
}

async function updateUserRole(userId: string, newRole: 'admin' | 'user'): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const userDocRef = doc(db, 'users', userId);
  await updateDoc(userDocRef, { role: newRole });
}

export function UserManagementDialog({ isOpen, onClose }: UserManagementDialogProps) {
  const { toast } = useToast();
  const queryClientTanstack = useQueryClient(); 

  const { data: users = [], isLoading: isLoadingUsers, error: fetchUsersError } = useQuery<AppUser[]>({
    queryKey: ['allUsers'],
    queryFn: fetchUsers,
    enabled: isOpen, 
  });

  const [userChanges, setUserChanges] = React.useState<Record<string, 'admin' | 'user'>>({});

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: 'admin' | 'user' }) => updateUserRole(userId, newRole),
    onSuccess: (_, variables) => {
      toast({
        title: 'Role Updated',
        description: `User role updated successfully for user ID: ${variables.userId}.`,
      });
      queryClientTanstack.invalidateQueries({ queryKey: ['allUsers'] });
    },
    onError: (error: any, variables) => {
      toast({
        variant: 'destructive',
        title: 'Error Updating Role',
        description: error.message || `Could not update role for user ID: ${variables.userId}.`,
      });
    },
  });

  const handleRoleChange = (userId: string, newRole: 'admin' | 'user') => {
    setUserChanges(prev => ({ ...prev, [userId]: newRole }));
  };

  const handleSaveChanges = (userId: string) => {
    const newRole = userChanges[userId];
    const originalUser = users.find(u => u.uid === userId);
    if (newRole && originalUser && originalUser.role !== newRole) {
        updateUserRoleMutation.mutate({ userId, newRole });
    } else if (newRole === originalUser?.role && userChanges[userId]){
        const updatedChanges = {...userChanges};
        delete updatedChanges[userId];
        setUserChanges(updatedChanges);
        toast({title: "No Change", description: "Selected role is the same as current."})
    }
  };
  
  React.useEffect(() => {
    if (!isOpen) {
        setUserChanges({}); 
    }
  }, [isOpen]);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-6 w-6" /> User Role Management</DialogTitle>
          <DialogDescription>
            This dialog allows administrators to manage the roles of existing users. 
            Users must first be created in Firebase Authentication and have a corresponding record in Firestore.
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
              <li>Add a field named `role` and set its value to `user` (or `admin`). You can also add `email`, `displayName`, etc.</li>
            </ol>
            Once these steps are completed, the user will appear in this list for role management after their first login or a page refresh.
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
                  <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
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
                        value={userChanges[user.uid] || user.role || 'user'}
                        onValueChange={(newRole) => handleRoleChange(user.uid, newRole as 'admin' | 'user')}
                        disabled={updateUserRoleMutation.isPending && updateUserRoleMutation.variables?.userId === user.uid}
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
                    <TableCell className="text-right">
                        <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleSaveChanges(user.uid)}
                            disabled={
                                (!userChanges[user.uid] || userChanges[user.uid] === user.role) ||
                                (updateUserRoleMutation.isPending && updateUserRoleMutation.variables?.userId === user.uid)
                            }
                            title="Save role change"
                        >
                            {updateUserRoleMutation.isPending && updateUserRoleMutation.variables?.userId === user.uid ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
         {!isLoadingUsers && !fetchUsersError && users.length === 0 && (
            <p className="py-4 text-center text-muted-foreground">No users found in Firestore `users` collection.</p>
         )}

        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={updateUserRoleMutation.isPending}><XCircle className="mr-2 h-4 w-4" /> Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
