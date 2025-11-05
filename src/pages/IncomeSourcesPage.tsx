import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import AddIncomeSourceForm from '../components/AddIncomeSourceForm';
import EditIncomeSourceForm from '../components/EditIncomeSourceForm';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter, // Import DialogFooter for confirmation dialog
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react'; // Import Trash2 icon

import styles from './IncomeSourcesPage.module.css';

interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  cycle: string;
  status: 'active' | 'paused';
}

interface IncomeSourcesPageProps {
  session: Session;
}

export default function IncomeSourcesPage({ session }: IncomeSourcesPageProps) {
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedIncomeSource, setSelectedIncomeSource] = useState<IncomeSource | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false); // State for delete confirmation dialog
  const [incomeSourceToDelete, setIncomeSourceToDelete] = useState<IncomeSource | null>(null); // State for income source to delete

  const fetchIncomeSources = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('income_sources')
      .select('id, user_id, name, amount, cycle, status') // Include user_id
      .eq('user_id', session.user.id);

    if (error) {
      setError(error.message);
      setIncomeSources([]);
    } else {
      setIncomeSources(data || []);
    }
    setLoading(false);
  }, [session.user.id]);

  useEffect(() => {
    fetchIncomeSources();

    const subscription = supabase
      .channel('income_sources_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'income_sources', filter: `user_id=eq.${session.user.id}` },
        () => {
          fetchIncomeSources();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [session.user.id, fetchIncomeSources]);

  const handleEditClick = (source: IncomeSource) => {
    setSelectedIncomeSource(source);
    setIsEditModalOpen(true);
  };

  const handleToggleStatus = async (source: IncomeSource) => {
    const newStatus = source.status === 'active' ? 'paused' : 'active';
    const { error } = await supabase
      .from('income_sources')
      .update({ status: newStatus })
      .eq('id', source.id)
      .eq('user_id', session.user.id);

    if (error) {
      toast.error("Error updating status", {
        description: error.message,
      });
    } else {
      toast.success("Success", {
        description: `Income source status updated to ${newStatus}!`, 
      });
      fetchIncomeSources();
    }
  };

  const handleDeleteClick = (source: IncomeSource) => {
    setIncomeSourceToDelete(source);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!incomeSourceToDelete) return;

    const { error } = await supabase
      .from('income_sources')
      .delete()
      .eq('id', incomeSourceToDelete.id)
      .eq('user_id', session.user.id);

    if (error) {
      toast.error("Error deleting income source", {
        description: error.message,
      });
    } else {
      toast.success("Success", {
        description: "Income source deleted successfully!",
      });
      fetchIncomeSources();
    }
    setIsDeleteConfirmOpen(false);
    setIncomeSourceToDelete(null);
  };

  if (loading) {
    return (
      <div className={`${styles.pageContainer} ${styles.loadingErrorContainer}`}>
        <p className={styles.loadingText}>Loading income sources...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.pageContainer} ${styles.loadingErrorContainer}`}>
        <p className={styles.errorText}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.maxWContainer}>
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>
            Income Sources
          </h1>
          {/* Add New Source Dialog */}
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button>Add New Source</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Income Source</DialogTitle>
                <DialogDescription>
                  Add a new income source to track your earnings.
                </DialogDescription>
              </DialogHeader>
              <AddIncomeSourceForm
                session={session}
                onSuccess={() => {
                  setIsAddModalOpen(false);
                  fetchIncomeSources();
                }}
              />
            </DialogContent>
          </Dialog>
        </header>

        <main>
          {incomeSources.length === 0 ? (
            <div className={styles.noIncomeContainer}>
              <p className={styles.noIncomeText}>No income sources found. Add one to get started!</p>
            </div>
          ) : (
            <div className={styles.incomeSourceList}>
              {incomeSources.map((source) => (
                <div key={source.id} className={styles.incomeSourceItem}>
                  <div>
                    <p className={styles.incomeSourceName}>{source.name}</p>
                    <p className={styles.incomeSourceDetails}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(source.amount)} / {source.cycle}
                    </p>
                  </div>
                  <div className={styles.itemActions}>
                    <span
                      className={source.status === 'active' ? styles.statusActive : styles.statusPaused}
                    >
                      {source.status}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(source)}
                    >
                      {source.status === 'active' ? 'Pause' : 'Resume'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(source)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(source)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Edit Income Source Dialog */}
        {selectedIncomeSource && (
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Income Source</DialogTitle>
                <DialogDescription>
                  Edit the details of your income source.
                </DialogDescription>
              </DialogHeader>
              <EditIncomeSourceForm
                session={session}
                incomeSource={selectedIncomeSource}
                onSuccess={() => {
                  setIsEditModalOpen(false);
                  setSelectedIncomeSource(null);
                  fetchIncomeSources();
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation Dialog */}
        {incomeSourceToDelete && (
          <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete the income source "{incomeSourceToDelete.name}"? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
} 