
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Search, Plus, Edit, Trash, Link2, Info } from 'lucide-react';
import { useKeywords } from '@/hooks/useKeywords';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Keyword = Tables<'keyword'>;

interface KeywordWithUsage extends Keyword {
  is_linked: boolean;
  contractor_count: number;
}

const CATEGORIES = [
  { key: 'skills', label: 'Skills', dbValue: 'skill' },
  { key: 'industries', label: 'Industries', dbValue: 'industry' },
  { key: 'certifications', label: 'Certifications', dbValue: 'certification' },
  { key: 'companies', label: 'Companies', dbValue: 'company' },
  { key: 'job-titles', label: 'Job Titles', dbValue: 'job_title' },
];

export default function ManageKeywords() {
  const [activeTab, setActiveTab] = useState('skills');
  const [searchTerm, setSearchTerm] = useState('');
  const [keywords, setKeywords] = useState<KeywordWithUsage[]>([]);
  const [filteredKeywords, setFilteredKeywords] = useState<KeywordWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<KeywordWithUsage | null>(null);
  const [newKeywordName, setNewKeywordName] = useState('');
  const [editKeywordName, setEditKeywordName] = useState('');
  const { toast } = useToast();

  const activeCategory = CATEGORIES.find(cat => cat.key === activeTab);

  // Fetch keywords with usage information
  const fetchKeywordsWithUsage = async (category: string) => {
    try {
      setLoading(true);
      
      const { data: keywordsData, error: keywordsError } = await supabase
        .from('keyword')
        .select(`
          *,
          contractor_keyword!inner(contractor_id)
        `)
        .eq('category', category);

      if (keywordsError) throw keywordsError;

      // Get usage counts
      const keywordIds = keywordsData?.map(k => k.id) || [];
      const { data: usageData, error: usageError } = await supabase
        .from('contractor_keyword')
        .select('keyword_id')
        .in('keyword_id', keywordIds);

      if (usageError) throw usageError;

      // Count usage per keyword
      const usageCounts = usageData?.reduce((acc, usage) => {
        acc[usage.keyword_id] = (acc[usage.keyword_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Get all keywords for this category (including unused ones)
      const { data: allKeywords, error: allError } = await supabase
        .from('keyword')
        .select('*')
        .eq('category', category)
        .order('name');

      if (allError) throw allError;

      const keywordsWithUsage: KeywordWithUsage[] = allKeywords?.map(keyword => ({
        ...keyword,
        is_linked: usageCounts[keyword.id] > 0,
        contractor_count: usageCounts[keyword.id] || 0,
      })) || [];

      setKeywords(keywordsWithUsage);
    } catch (error) {
      console.error('Error fetching keywords:', error);
      toast({
        title: "Error",
        description: "Failed to fetch keywords",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter keywords based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredKeywords(keywords);
    } else {
      const filtered = keywords.filter(keyword =>
        keyword.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredKeywords(filtered);
    }
  }, [keywords, searchTerm]);

  // Fetch keywords when tab changes
  useEffect(() => {
    if (activeCategory) {
      fetchKeywordsWithUsage(activeCategory.dbValue);
    }
  }, [activeTab]);

  // Reset search when tab changes
  useEffect(() => {
    setSearchTerm('');
  }, [activeTab]);

  const handleAddKeyword = async () => {
    if (!newKeywordName.trim() || !activeCategory) return;

    try {
      const { error } = await supabase
        .from('keyword')
        .insert({
          name: newKeywordName.trim(),
          category: activeCategory.dbValue
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Keyword added successfully"
      });

      setNewKeywordName('');
      setIsAddDialogOpen(false);
      fetchKeywordsWithUsage(activeCategory.dbValue);
    } catch (error) {
      console.error('Error adding keyword:', error);
      toast({
        title: "Error",
        description: "Failed to add keyword",
        variant: "destructive"
      });
    }
  };

  const handleEditKeyword = async () => {
    if (!editKeywordName.trim() || !selectedKeyword) return;

    try {
      const { error } = await supabase
        .from('keyword')
        .update({ name: editKeywordName.trim() })
        .eq('id', selectedKeyword.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Keyword updated successfully"
      });

      setEditKeywordName('');
      setIsEditDialogOpen(false);
      setSelectedKeyword(null);
      if (activeCategory) {
        fetchKeywordsWithUsage(activeCategory.dbValue);
      }
    } catch (error) {
      console.error('Error updating keyword:', error);
      toast({
        title: "Error",
        description: "Failed to update keyword",
        variant: "destructive"
      });
    }
  };

  const handleDeleteKeyword = async () => {
    if (!selectedKeyword) return;

    try {
      const { error } = await supabase
        .from('keyword')
        .delete()
        .eq('id', selectedKeyword.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Keyword deleted successfully"
      });

      setIsDeleteDialogOpen(false);
      setSelectedKeyword(null);
      if (activeCategory) {
        fetchKeywordsWithUsage(activeCategory.dbValue);
      }
    } catch (error) {
      console.error('Error deleting keyword:', error);
      toast({
        title: "Error",
        description: "Failed to delete keyword",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (keyword: KeywordWithUsage) => {
    setSelectedKeyword(keyword);
    setEditKeywordName(keyword.name);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (keyword: KeywordWithUsage) => {
    setSelectedKeyword(keyword);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Manage Keywords</h1>
        <p className="text-gray-600">Organize and maintain your keyword taxonomy</p>
      </div>

      {/* Legend */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Legend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">
                <Link2 className="h-3 w-3 mr-1" />
                Linked
              </Badge>
              <span>Keywords currently used by contractors (cannot be deleted)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Unlinked</Badge>
              <span>Keywords not currently in use (can be safely deleted)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Keyword Management</CardTitle>
          <CardDescription>
            Manage keywords by category. Linked keywords are currently used by contractors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              {CATEGORIES.map(category => (
                <TabsTrigger key={category.key} value={category.key}>
                  {category.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {CATEGORIES.map(category => (
              <TabsContent key={category.key} value={category.key} className="space-y-4">
                {/* Search and Add Controls */}
                <div className="flex justify-between items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={`Search ${category.label.toLowerCase()}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add {category.label.slice(0, -1)}
                  </Button>
                </div>

                {/* Keywords Table */}
                {loading ? (
                  <div className="text-center py-8">Loading keywords...</div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Usage Count</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredKeywords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                              {searchTerm ? `No ${category.label.toLowerCase()} found matching "${searchTerm}"` : `No ${category.label.toLowerCase()} found`}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredKeywords.map(keyword => (
                            <TableRow key={keyword.id}>
                              <TableCell className="font-medium">{keyword.name}</TableCell>
                              <TableCell>
                                {keyword.is_linked ? (
                                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">
                                    <Link2 className="h-3 w-3 mr-1" />
                                    Linked
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Unlinked</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {keyword.contractor_count > 0 ? (
                                  <span className="text-blue-600 font-medium">
                                    {keyword.contractor_count} contractor{keyword.contractor_count !== 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">Not used</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(keyword)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openDeleteDialog(keyword)}
                                    disabled={keyword.is_linked}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Keyword Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New {activeCategory?.label.slice(0, -1)}</DialogTitle>
            <DialogDescription>
              Enter the name for the new {activeCategory?.label.toLowerCase().slice(0, -1)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newKeyword">Name</Label>
              <Input
                id="newKeyword"
                value={newKeywordName}
                onChange={(e) => setNewKeywordName(e.target.value)}
                placeholder={`Enter ${activeCategory?.label.toLowerCase().slice(0, -1)} name`}
                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddKeyword} disabled={!newKeywordName.trim()}>
              Add {activeCategory?.label.slice(0, -1)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Keyword Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {activeCategory?.label.slice(0, -1)}</DialogTitle>
            <DialogDescription>
              Update the name of this {activeCategory?.label.toLowerCase().slice(0, -1)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editKeyword">Name</Label>
              <Input
                id="editKeyword"
                value={editKeywordName}
                onChange={(e) => setEditKeywordName(e.target.value)}
                placeholder={`Enter ${activeCategory?.label.toLowerCase().slice(0, -1)} name`}
                onKeyDown={(e) => e.key === 'Enter' && handleEditKeyword()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditKeyword} disabled={!editKeywordName.trim()}>
              Update {activeCategory?.label.slice(0, -1)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Keyword Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {activeCategory?.label.slice(0, -1)}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedKeyword?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedKeyword?.is_linked && (
            <Alert>
              <AlertDescription>
                This keyword is currently linked to {selectedKeyword.contractor_count} contractor{selectedKeyword.contractor_count !== 1 ? 's' : ''} and cannot be deleted.
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteKeyword}
              disabled={selectedKeyword?.is_linked}
            >
              Delete {activeCategory?.label.slice(0, -1)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
