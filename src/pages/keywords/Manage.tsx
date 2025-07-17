import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, Trash, Link2, Info, Users } from "lucide-react";
import { useKeywords, KeywordWithUsage } from "@/hooks/keywords/useKeywords";
import { LinkedContractorsDialog } from "@/components/keywords/LinkedContractorsDialog";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/shared/use-toast";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

const CATEGORIES = [
  { key: "skills", label: "Skills", singular: "Skill", dbValue: "skill" }, // Using singular form from DB
  {
    key: "industries",
    label: "Industries",
    singular: "Industry",
    dbValue: "industry", // Using singular form from DB
  },
  {
    key: "certifications",
    label: "Certifications",
    singular: "Certification",
    dbValue: "certification", // Using singular form from DB
  },
  {
    key: "companies",
    label: "Companies",
    singular: "Company",
    dbValue: "company", // Using singular form from DB
  },
  {
    key: "job-titles",
    label: "Job Titles",
    singular: "Job Title",
    dbValue: "job_title", // Using singular form from DB
  },
];

export default function ManageKeywords() {
  const [activeTab, setActiveTab] = useState("skills");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredKeywords, setFilteredKeywords] = useState<KeywordWithUsage[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLinkedContractorsDialogOpen, setIsLinkedContractorsDialogOpen] =
    useState(false);
  const [selectedKeyword, setSelectedKeyword] =
    useState<KeywordWithUsage | null>(null);
  const [newKeywordName, setNewKeywordName] = useState("");
  const [editKeywordName, setEditKeywordName] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Use our optimized hook
  const { keywordsWithUsage, loading: hookLoading, fetchKeywordsWithUsage, error, createKeyword } = useKeywords();

  // Add direct state for keywords as a fallback
  const [directKeywords, setDirectKeywords] = useState<KeywordWithUsage[]>([]);
  const [directLoading, setDirectLoading] = useState(false);

  // Combine loading states
  const loading = hookLoading || directLoading;

  const activeCategory = CATEGORIES.find((cat) => cat.key === activeTab);

  // Filter keywords based on search term
  useEffect(() => {
    console.log('keywordsWithUsage updated:', keywordsWithUsage.length, 'keywords');

    if (!searchTerm.trim()) {
      setFilteredKeywords(keywordsWithUsage);
      console.log('Setting all keywords:', keywordsWithUsage.length);
    } else {
      const filtered = keywordsWithUsage.filter((keyword) =>
        keyword.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredKeywords(filtered);
      console.log('Setting filtered keywords:', filtered.length);
    }
  }, [keywordsWithUsage, searchTerm]);

  // Fetch keywords when tab changes
  useEffect(() => {
    if (activeCategory) {
      console.log('Active category changed to:', activeCategory.key, 'with dbValue:', activeCategory.dbValue);

      // Use direct approach to fetch keywords
      setDirectLoading(true);

      // First, get all keywords for this category
      const fetchKeywords = async () => {
        try {
          const { data: keywordsData, error: keywordsError } = await supabase
            .from('keyword')
            .select('*')
            .eq('category', activeCategory.dbValue)
            .order('name');

          if (keywordsError) {
            console.error('Error fetching keywords:', keywordsError);
            setDirectLoading(false);
            return;
          }

          console.log(`Found ${keywordsData?.length || 0} keywords for ${activeCategory.dbValue}`);

          if (!keywordsData || keywordsData.length === 0) {
            setDirectKeywords([]);
            setFilteredKeywords([]);
            setDirectLoading(false);
            return;
          }

          // Get all contractor_keyword entries for these keywords
          const { data: allLinks, error: linkError } = await supabase
            .from('contractor_keyword')
            .select('keyword_id, contractor_id');

          if (linkError) {
            console.error('Error fetching keyword links:', linkError);
          }

          console.log(`Found ${allLinks?.length || 0} total links`);

          // Create a map of keyword ID to count
          const countMap: Record<string, Set<string>> = {};

          // Group by keyword_id and count unique contractor_ids
          if (allLinks) {
            allLinks.forEach(link => {
              if (!countMap[link.keyword_id]) {
                countMap[link.keyword_id] = new Set();
              }
              countMap[link.keyword_id].add(link.contractor_id);
            });
          }

          // Create keywords with usage information
          const keywordsWithUsageData = keywordsData.map(keyword => {
            const contractorIds = countMap[keyword.id] || new Set();
            return {
              ...keyword,
              is_linked: contractorIds.size > 0,
              contractor_count: contractorIds.size
            };
          });

          // Log summary of linked vs unlinked keywords
          const linkedCount = keywordsWithUsageData.filter(k => k.is_linked).length;
          const unlinkedCount = keywordsWithUsageData.length - linkedCount;
          console.log(`Keywords with links: ${linkedCount}, without links: ${unlinkedCount}`);

          // Log some sample keywords with their link counts
          const sampleLinked = keywordsWithUsageData.filter(k => k.is_linked).slice(0, 3);
          const sampleUnlinked = keywordsWithUsageData.filter(k => !k.is_linked).slice(0, 3);

          console.log('Sample linked keywords:');
          sampleLinked.forEach(k => console.log(`- ${k.name}: ${k.contractor_count} links`));

          console.log('Sample unlinked keywords:');
          sampleUnlinked.forEach(k => console.log(`- ${k.name}: ${k.contractor_count} links`));

          setDirectKeywords(keywordsWithUsageData);
          setFilteredKeywords(keywordsWithUsageData);

          console.log('Set direct keywords:', keywordsData.length);
        } catch (error) {
          console.error('Error in direct keyword fetch:', error);
        } finally {
          setDirectLoading(false);
        }
      };

      fetchKeywords();
    }
  }, [activeTab, activeCategory]);

  // Reset search when tab changes
  useEffect(() => {
    setSearchTerm("");
  }, [activeTab]);

  const handleAddKeyword = async () => {
    if (!newKeywordName.trim() || !activeCategory) return;

    try {
      // Use the createKeyword function from our hook
      await createKeyword(newKeywordName.trim(), activeCategory.dbValue);

      toast({
        title: "Success",
        description: "Keyword added successfully",
      });

      setNewKeywordName("");
      setIsAddDialogOpen(false);

      // Refresh the keyword list with usage information
      if (activeCategory) {
        fetchKeywordsWithUsage(activeCategory.dbValue);
      }
    } catch (error) {
      console.error("Error adding keyword:", error);
      toast({
        title: "Error",
        description: "Failed to add keyword",
        variant: "destructive",
      });
    }
  };

  const handleEditKeyword = async () => {
    if (!editKeywordName.trim() || !selectedKeyword) return;

    try {
      const { error } = await supabase
        .from("keyword")
        .update({ name: editKeywordName.trim() })
        .eq("id", selectedKeyword.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Keyword updated successfully",
      });

      setEditKeywordName("");
      setIsEditDialogOpen(false);
      setSelectedKeyword(null);
      if (activeCategory) {
        fetchKeywordsWithUsage(activeCategory.dbValue);
      }
    } catch (error) {
      console.error("Error updating keyword:", error);
      toast({
        title: "Error",
        description: "Failed to update keyword",
        variant: "destructive",
      });
    }
  };

  const handleDeleteKeyword = async () => {
    if (!selectedKeyword) return;

    try {
      const { error } = await supabase
        .from("keyword")
        .delete()
        .eq("id", selectedKeyword.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Keyword deleted successfully",
      });

      setIsDeleteDialogOpen(false);
      setSelectedKeyword(null);
      if (activeCategory) {
        fetchKeywordsWithUsage(activeCategory.dbValue);
      }
    } catch (error) {
      console.error("Error deleting keyword:", error);
      toast({
        title: "Error",
        description: "Failed to delete keyword",
        variant: "destructive",
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

  const openLinkedContractorsDialog = (keyword: KeywordWithUsage) => {
    setSelectedKeyword(keyword);
    setIsLinkedContractorsDialogOpen(true);
  };

  const handleContractorClick = (contractorId: string) => {
    // Navigate directly to the contractor profile page with return path in state
    navigate(`/contractors/profile/${contractorId}`, {
      state: {
        returnPath: "/keywords", // Return to keywords page when closed
      },
    });
  };

  const handleUnlinkRefresh = () => {
    if (activeCategory) {
      fetchKeywordsWithUsage(activeCategory.dbValue);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Manage Keywords
        </h1>
        <p className="text-gray-600">
          Organize and maintain your keyword taxonomy
        </p>
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
              <Badge
                variant="outline"
                className="bg-blue-50 border-blue-200 text-blue-800"
              >
                <Link2 className="h-3 w-3 mr-1" />
                Linked
              </Badge>
              <span>Keywords currently used by contractors</span>
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
            Manage keywords by category. Click on linked keywords to view and
            manage contractors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-5">
              {CATEGORIES.map((category) => (
                <TabsTrigger key={category.key} value={category.key}>
                  {category.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {CATEGORIES.map((category) => (
              <TabsContent
                key={category.key}
                value={category.key}
                className="space-y-4"
              >
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
                    Add {category.singular}
                  </Button>
                </div>

                {/* Keywords Table */}
                {loading ? (
                  <div className="text-center py-8">Loading keywords...</div>
                ) : (
                  <div className="border rounded-lg">
                    {/* Add fixed height container with scrolling */}
                    <div className="max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Usage Count</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredKeywords.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="text-center py-8 text-gray-500"
                              >
                                {searchTerm
                                  ? `No ${category.label.toLowerCase()} found matching "${searchTerm}"`
                                  : `No ${category.label.toLowerCase()} found`}
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredKeywords.map((keyword) => (
                              <TableRow key={keyword.id}>
                                <TableCell className="font-medium">
                                  {keyword.name}
                                </TableCell>
                                <TableCell>
                                  {keyword.is_linked ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-blue-50 border-blue-200 text-blue-800 cursor-pointer hover:bg-blue-100"
                                      onClick={() =>
                                        openLinkedContractorsDialog(keyword)
                                      }
                                    >
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
                                      {keyword.contractor_count} contractor
                                      {keyword.contractor_count !== 1
                                        ? "s"
                                        : ""}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">
                                      Not used
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    {keyword.is_linked && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          openLinkedContractorsDialog(keyword)
                                        }
                                      >
                                        <Users className="h-4 w-4" />
                                      </Button>
                                    )}
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
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Linked Contractors Dialog */}
      <LinkedContractorsDialog
        keyword={selectedKeyword}
        isOpen={isLinkedContractorsDialogOpen}
        onClose={() => setIsLinkedContractorsDialogOpen(false)}
        onContractorClick={handleContractorClick}
        onUnlink={handleUnlinkRefresh}
      />

      {/* Add Keyword Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New {activeCategory?.singular}</DialogTitle>
            <DialogDescription>
              Enter the name for the new{" "}
              {activeCategory?.singular.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newKeyword">Name</Label>
              <Input
                id="newKeyword"
                value={newKeywordName}
                onChange={(e) => setNewKeywordName(e.target.value)}
                placeholder={`Enter ${activeCategory?.singular.toLowerCase()} name`}
                onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddKeyword}
              disabled={!newKeywordName.trim()}
            >
              Add {activeCategory?.singular}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Keyword Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {activeCategory?.singular}</DialogTitle>
            <DialogDescription>
              Update the name of this {activeCategory?.singular.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editKeyword">Name</Label>
              <Input
                id="editKeyword"
                value={editKeywordName}
                onChange={(e) => setEditKeywordName(e.target.value)}
                placeholder={`Enter ${activeCategory?.singular.toLowerCase()} name`}
                onKeyDown={(e) => e.key === "Enter" && handleEditKeyword()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditKeyword}
              disabled={!editKeywordName.trim()}
            >
              Update {activeCategory?.singular}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Keyword Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {activeCategory?.singular}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedKeyword?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedKeyword?.is_linked && (
            <Alert>
              <AlertDescription>
                This keyword is currently linked to{" "}
                {selectedKeyword.contractor_count} contractor
                {selectedKeyword.contractor_count !== 1 ? "s" : ""} and cannot
                be deleted.
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteKeyword}
              disabled={selectedKeyword?.is_linked}
            >
              Delete {activeCategory?.singular}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
