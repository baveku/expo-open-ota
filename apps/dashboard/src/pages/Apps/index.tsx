import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSelectedApp } from '@/lib/SelectedAppContext';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Box, Plus, AppWindow, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const Apps = () => {
  const { apps, setSelectedAppId } = useSelectedApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [formData, setFormData] = useState({ id: '', name: '', accessToken: '' });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.createApp(data);
    },
    onSuccess: (newApp) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setOpen(false);
      setFormData({ id: '', name: '', accessToken: '' });
      setSelectedAppId(newApp.id);
      navigate('/updates');
      toast({ title: 'Success', description: 'App created successfully' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.accessToken) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'ID and Access Token are required' });
      return;
    }
    createMutation.mutate(formData);
  };

  const deleteMutation = useMutation({
    mutationFn: async (appId: string) => {
      return api.deleteApp(appId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setDeleteOpen(false);
      setAppToDelete(null);
      setDeleteConfirmText('');
      toast({ title: 'Success', description: 'App deleted successfully' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (appToDelete) {
      deleteMutation.mutate(appToDelete.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Apps</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add App
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add New App</DialogTitle>
                <DialogDescription>
                  Enter the details from your Expo dashboard to register a new app.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="id">Expo App ID (UUID)</Label>
                  <Input id="id" value={formData.id} onChange={e => setFormData({ ...formData, id: e.target.value })} placeholder="e.g. 12345678-1234-1234-1234-123456789012" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">App Name</Label>
                  <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Production App" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accessToken">Expo Access Token</Label>
                  <Input id="accessToken" type="password" value={formData.accessToken} onChange={e => setFormData({ ...formData, accessToken: e.target.value })} placeholder="expo_..." />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : 'Save App'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <form onSubmit={handleDeleteSubmit}>
              <DialogHeader>
                <DialogTitle>Delete App</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete the app
                  <span className="font-semibold text-black"> {appToDelete?.name || appToDelete?.id} </span>
                  and all its configurations from the server.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="confirm">
                    Please type <strong>{appToDelete?.name || appToDelete?.id}</strong> to confirm.
                  </Label>
                  <Input 
                    id="confirm" 
                    value={deleteConfirmText} 
                    onChange={e => setDeleteConfirmText(e.target.value)} 
                    placeholder={appToDelete?.name || appToDelete?.id} 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setDeleteOpen(false); setDeleteConfirmText(''); }}>Cancel</Button>
                <Button 
                  type="submit" 
                  variant="destructive" 
                  disabled={deleteMutation.isPending || deleteConfirmText !== (appToDelete?.name || appToDelete?.id)}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'I understand the consequences, delete this app'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {apps.length === 0 ? (
        <Card className="text-center p-10">
          <CardHeader>
            <Box className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <CardTitle>No apps configured</CardTitle>
            <CardDescription>Click the Add App button to register your first Expo app.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((app) => (
            <Card key={app.id} className="hover:border-primary cursor-pointer transition-colors" onClick={() => {
              setSelectedAppId(app.id);
              navigate('/updates');
            }}>
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <AppWindow className="w-5 h-5 text-gray-500 shrink-0" />
                    <span className="truncate">{app.name || app.id}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAppToDelete({ id: app.id, name: app.name || '' });
                      setDeleteConfirmText('');
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardTitle>
                <CardDescription className="truncate">{app.id}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full">View Updates</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
