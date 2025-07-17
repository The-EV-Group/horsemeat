
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/shared/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Keyword = Tables<'keyword'>;
type Contractor = Tables<'contractor'>;

interface LinkedContractor {
  id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  link_id: string;
}

interface LinkedContractorsDialogProps {
  keyword: Keyword | null;
  isOpen: boolean;
  onClose: () => void;
  onContractorClick: (contractorId: string) => void;
  onUnlink: () => void;
}

export function LinkedContractorsDialog({
  keyword,
  isOpen,
  onClose,
  onContractorClick,
  onUnlink
}: LinkedContractorsDialogProps) {
  const [linkedContractors, setLinkedContractors] = useState<LinkedContractor[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchLinkedContractors = async () => {
    if (!keyword) return;

    try {
      setLoading(true);
      console.log(`Fetching contractors linked to keyword: ${keyword.name} (${keyword.id})`);
      
      // First, get the count of linked contractors
      const { count, error: countError } = await supabase
        .from('contractor_keyword')
        .select('*', { count: 'exact', head: true })
        .eq('keyword_id', keyword.id);
        
      if (countError) {
        console.error('Error counting linked contractors:', countError);
      } else {
        console.log(`Found ${count} linked contractors for keyword ${keyword.name}`);
      }
      
      // Get all linked contractors in batches to handle large numbers
      const batchSize = 100;
      let allContractors: LinkedContractor[] = [];
      let hasMore = true;
      let page = 0;
      
      while (hasMore) {
        // Get a batch of contractors
        const { data, error } = await supabase
          .from('contractor_keyword')
          .select(`
            contractor_id,
            contractor:contractor_id (
              id,
              full_name,
              email,
              city,
              state
            )
          `)
          .eq('keyword_id', keyword.id)
          .range(page * batchSize, (page + 1) * batchSize - 1);
          
        if (error) {
          console.error(`Error fetching contractors batch ${page}:`, error);
          break;
        }
        
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          // Filter out any items with missing contractor data
          const validData = data.filter(item => item.contractor && item.contractor.id);
          
          const contractors = validData.map(item => ({
            id: item.contractor.id,
            full_name: item.contractor.full_name,
            email: item.contractor.email,
            city: item.contractor.city,
            state: item.contractor.state,
            link_id: `${item.contractor_id}-${keyword.id}`
          }));
          
          allContractors = [...allContractors, ...contractors];
          
          // Check if we need to fetch more
          if (data.length < batchSize) {
            hasMore = false;
          } else {
            page++;
          }
          
          console.log(`Fetched batch ${page}, got ${contractors.length} contractors, total so far: ${allContractors.length}`);
        }
      }

      console.log(`Processed ${allContractors.length} linked contractors`);
      setLinkedContractors(allContractors);
    } catch (error) {
      console.error('Error fetching linked contractors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch linked contractors",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async (contractorId: string) => {
    if (!keyword) return;

    try {
      const { error } = await supabase
        .from('contractor_keyword')
        .delete()
        .eq('contractor_id', contractorId)
        .eq('keyword_id', keyword.id);

      if (error) throw error;

      setLinkedContractors(prev => prev.filter(c => c.id !== contractorId));
      onUnlink();

      toast({
        title: "Success",
        description: "Contractor unlinked from keyword"
      });
    } catch (error) {
      console.error('Error unlinking contractor:', error);
      toast({
        title: "Error",
        description: "Failed to unlink contractor",
        variant: "destructive"
      });
    }
  };

  // Fetch contractors when dialog opens
  React.useEffect(() => {
    if (isOpen && keyword) {
      fetchLinkedContractors();
    }
  }, [isOpen, keyword]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Contractors linked to "{keyword?.name}"</DialogTitle>
          <DialogDescription>
            View and manage contractors associated with this keyword
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Loading contractors...</div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {linkedContractors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No contractors linked to this keyword
              </div>
            ) : (
              linkedContractors.map(contractor => (
                <div
                  key={contractor.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{contractor.full_name}</h4>
                      <p className="text-sm text-gray-600">{contractor.email}</p>
                      {contractor.city && contractor.state && (
                        <p className="text-xs text-gray-500">
                          {contractor.city}, {contractor.state}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onContractorClick(contractor.id)}
                    >
                      View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnlink(contractor.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
