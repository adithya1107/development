import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface MeetingRow {
  id: string;
  meeting_date: string;
  teacher_id: string;
  student_id: string;
  parent_id?: string | null;
  meeting_type?: string | null;
  status?: string | null;
  meeting_url?: string | null;
}

const AdminPTMManagement: React.FC = () => {
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('parent_meetings')
          .select('id, meeting_date, teacher_id, student_id, parent_id, meeting_type, status, meeting_url')
          .order('meeting_date', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Failed to fetch meetings:', error);
          setMeetings([]);
        } else {
          setMeetings((data || []) as MeetingRow[]);
        }
      } catch (err) {
        console.error('Error loading meetings:', err);
        setMeetings([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">PTM Video Calls (Admin)</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading meetings…</div>
      ) : (
        <div className="overflow-x-auto bg-card border border-white/5 rounded-lg shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="p-3">Date</th>
                <th className="p-3">Teacher</th>
                <th className="p-3">Student</th>
                <th className="p-3">Parent</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {meetings.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-muted-foreground">No meetings found</td>
                </tr>
              )}
              {meetings.map((m) => (
                <tr key={m.id} className="border-t border-white/5">
                  <td className="p-3 align-top">{new Date(m.meeting_date).toLocaleString()}</td>
                  <td className="p-3 align-top">{m.teacher_id}</td>
                  <td className="p-3 align-top">{m.student_id}</td>
                  <td className="p-3 align-top">{m.parent_id || '-'}</td>
                  <td className="p-3 align-top">{m.meeting_type || '-'}</td>
                  <td className="p-3 align-top">{m.status || '-'}</td>
                  <td className="p-3 align-top">
                    <div className="flex items-center space-x-2">
                      {m.meeting_url ? (
                        <a href={m.meeting_url} target="_blank" rel="noreferrer">
                          <Button variant="outline">Open Room</Button>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">No room</span>
                      )}
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          // quick inspector: open meeting detail in a new tab using query param
                          const url = `/admin?view=dashboard&meeting_id=${m.id}`;
                          window.open(url, '_blank');
                        }}
                      >
                        Inspect
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPTMManagement;
