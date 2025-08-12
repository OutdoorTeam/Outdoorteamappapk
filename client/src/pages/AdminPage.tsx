import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';

const AdminPage: React.FC = () => {
  const [users, setUsers] = React.useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', plan: 'Standard', active: true },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', plan: 'Advanced', active: true },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', plan: 'Premium', active: false },
  ]);
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterPlan, setFilterPlan] = React.useState('all');
  const [broadcastMessage, setBroadcastMessage] = React.useState('');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === 'all' || user.plan.toLowerCase() === filterPlan.toLowerCase();
    return matchesSearch && matchesPlan;
  });

  const toggleUserActive = (userId: number) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, active: !user.active } : user
    ));
  };

  const handleBroadcastSend = () => {
    if (broadcastMessage.trim()) {
      console.log('Broadcasting message:', broadcastMessage);
      setBroadcastMessage('');
      // TODO: Send broadcast message to all users
    }
  };

  const handleFileUpload = (userId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log(`Uploading file for user ${userId}:`, file.name);
      // TODO: Upload file for specific user
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, plans, and content</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* User Management */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user accounts and plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Label htmlFor="search">Search Users</Label>
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="filter">Filter by Plan</Label>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="All plans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.plan === 'Premium' ? 'bg-purple-100 text-purple-800' :
                          user.plan === 'Advanced' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.plan}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={user.active}
                            onCheckedChange={() => toggleUserActive(user.id)}
                          />
                          <span className="text-sm">
                            {user.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            Edit
                          </Button>
                          <div>
                            <input
                              type="file"
                              id={`file-${user.id}`}
                              className="hidden"
                              accept=".pdf"
                              onChange={(e) => handleFileUpload(user.id, e)}
                            />
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => document.getElementById(`file-${user.id}`)?.click()}
                            >
                              Upload PDF
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Broadcast Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Broadcast Message</CardTitle>
            <CardDescription>Send messages to all users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Input
                  id="message"
                  placeholder="Type your message..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleBroadcastSend} 
                className="w-full"
                disabled={!broadcastMessage.trim()}
              >
                Send Broadcast
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">24</CardTitle>
            <CardDescription>Total Users</CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">18</CardTitle>
            <CardDescription>Active Users</CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">8</CardTitle>
            <CardDescription>Premium Plans</CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">12</CardTitle>
            <CardDescription>Files Uploaded</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default AdminPage;
