
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  HelpCircle, 
  Ticket, 
  Phone, 
  Mail, 
  MessageSquare,
  Plus,
  Search,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SupportHelpProps {
  studentData: any;
}

const SupportHelp: React.FC<SupportHelpProps> = ({ studentData }) => {
  const [supportTickets, setSupportTickets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Sample FAQs (in a real app, these would come from the database)
  const faqs = [
    {
      id: 1,
      category: 'Academic',
      question: 'How do I access my course materials?',
      answer: 'You can access your course materials by going to the "My Courses" section, selecting your course, and clicking on the "Materials" tab. All lecture notes, videos, and resources will be available for download.'
    },
    {
      id: 2,
      category: 'Academic',
      question: 'How do I submit assignments?',
      answer: 'To submit assignments, navigate to "My Courses", select the relevant course, go to the "Assignments" tab, find your assignment, and click "Submit Assignment". You can type your answer or upload files as required.'
    },
    {
      id: 3,
      category: 'Technical',
      question: 'I forgot my password. How do I reset it?',
      answer: 'Click on the "Forgot Password" link on the login page. Enter your user code and follow the instructions sent to your registered email address.'
    },
    {
      id: 4,
      category: 'Technical',
      question: 'The website is not loading properly. What should I do?',
      answer: 'Try clearing your browser cache and cookies, or try accessing the site from a different browser. If the problem persists, submit a technical support ticket.'
    },
    {
      id: 5,
      category: 'Financial',
      question: 'How do I make fee payments online?',
      answer: 'Go to the "Payments & Fees" section, select the pending fee you want to pay, choose your payment method, and follow the secure payment process.'
    },
    {
      id: 6,
      category: 'Financial',
      question: 'Where can I download my payment receipts?',
      answer: 'All payment receipts are available in the "Payments & Fees" section under "Payment History". Click the "Receipt" button next to any completed payment.'
    },
    {
      id: 7,
      category: 'Hostel',
      question: 'How do I apply for hostel accommodation?',
      answer: 'Visit the "Hostel & Facility" section, review available rooms, and click "Apply for Hostel". Fill out the application form with your preferences and submit.'
    },
    {
      id: 8,
      category: 'Hostel',
      question: 'Can I change my room after allocation?',
      answer: 'Room changes are subject to availability and approval. Submit a facility request with your reason for the room change, and the hostel administration will review it.'
    },
    {
      id: 9,
      category: 'General',
      question: 'How do I update my personal information?',
      answer: 'Currently, personal information updates need to be requested through the administration. Please submit a support ticket with the details you need to update.'
    },
    {
      id: 10,
      category: 'General',
      question: 'Who do I contact for medical emergencies?',
      answer: 'For medical emergencies, immediately contact the campus medical center at extension 911 or call the emergency number provided in your student handbook.'
    }
  ];

  const contactInfo = {
    academic: {
      title: 'Academic Support',
      email: 'team@colcord.co.in',
      phone: '+91 9311013848',
      hours: 'Mon-Fri: 9:00 AM - 5:00 PM'
    },
    technical: {
      title: 'Technical Support',
      email: 'team@colcord.co.in',
      phone: '+91 9311013848',
      hours: '24/7 Online Support'
    },
    financial: {
      title: 'Financial Services',
      email: 'team@colcord.co.in',
      phone: '+91 9311013848',
      hours: 'Mon-Fri: 8:00 AM - 6:00 PM'
    },
    hostel: {
      title: 'Hostel Administration',
      email: 'team@colcord.co.in',
      phone: '+91 9311013848',
      hours: 'Mon-Sun: 6:00 AM - 10:00 PM'
    },
    general: {
      title: 'General Support',
      email: 'team@colcord.co.in',
      phone: '+91 9311013848',
      hours: 'Mon-Fri: 9:00 AM - 5:00 PM'
    }
  };

  useEffect(() => {
    fetchSupportTickets();
  }, [studentData]);

  const fetchSupportTickets = async () => {
    try {
      const { data: ticketsData } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('student_id', studentData.user_id)
        .order('created_at', { ascending: false });

      setSupportTickets(ticketsData || []);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch support tickets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createSupportTicket = async (category: string, title: string, description: string, priority: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          student_id: studentData.user_id,
          college_id: studentData.college_id,
          title: title,
          description: description,
          category: category,
          priority: priority,
          status: 'open'
        });

      if (error) throw error;

      toast({
        title: 'Ticket Created',
        description: 'Your support ticket has been submitted successfully',
      });

      fetchSupportTickets();
    } catch (error) {
      console.error('Error creating support ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to create support ticket',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'destructive';
      case 'in_progress':
        return 'default';
      case 'resolved':
        return 'default';
      case 'closed':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'resolved':
      case 'closed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <HelpCircle className="h-4 w-4" />;
    }
  };

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedFaqs = filteredFaqs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, typeof faqs>);

  if (loading) {
    return <div className="flex justify-center py-8">Loading support information...</div>;
  }

  return (
  <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-6 w-full max-w-full">
    <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3">
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Support & Help</h2>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs sm:text-sm whitespace-nowrap">
          {supportTickets.length} My Tickets
        </Badge>
        <Badge variant="outline" className="text-xs sm:text-sm whitespace-nowrap">
          {faqs.length} FAQs
        </Badge>
      </div>
    </div>

    <Tabs defaultValue="tickets" className="space-y-4 sm:space-y-6 w-full">
      <div className="w-full">
  <TabsList className="grid w-full grid-cols-3 h-auto">
    <TabsTrigger value="tickets" className="flex flex-col xs:flex-row items-center gap-1 xs:gap-2 text-[10px] xs:text-xs sm:text-sm px-1 xs:px-2 sm:px-3 py-2">
      <Ticket className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
      <span className="truncate max-w-full">Support Tickets</span>
    </TabsTrigger>
    <TabsTrigger value="faqs" className="flex flex-col xs:flex-row items-center gap-1 xs:gap-2 text-[10px] xs:text-xs sm:text-sm px-1 xs:px-2 sm:px-3 py-2">
      <BookOpen className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
      <span className="truncate max-w-full">FAQs</span>
    </TabsTrigger>
    <TabsTrigger value="contact" className="flex flex-col xs:flex-row items-center gap-1 xs:gap-2 text-[10px] xs:text-xs sm:text-sm px-1 xs:px-2 sm:px-3 py-2">
      <Phone className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
      <span className="truncate max-w-full">Contact Info</span>
    </TabsTrigger>
  </TabsList>
</div>

      <TabsContent value="tickets" className="space-y-4 sm:space-y-6">
        {/* New Ticket Button */}
        <div className="flex justify-end">
          <SupportTicketDialog onCreate={createSupportTicket} />
        </div>

        {/* My Tickets */}
        <Card className="w-full">
          <CardHeader className="p-4 sm:p-5 md:p-6">
            <CardTitle className="text-base sm:text-lg">My Support Tickets</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 md:p-6">
            {supportTickets.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <Ticket className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">No Support Tickets</h3>
                <p className="text-sm sm:text-base text-gray-500 mb-4">You haven't submitted any support tickets yet.</p>
                <SupportTicketDialog onCreate={createSupportTicket} />
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {supportTickets.map((ticket: any) => (
                  <Card key={ticket.id} className="border w-full">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm sm:text-base break-words">{ticket.title}</h4>
                          <p className="text-xs sm:text-sm text-gray-600 break-words">
                            Ticket #{ticket.id.slice(-8)} • {ticket.category}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Created: {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(ticket.status)}
                            <Badge variant={getStatusColor(ticket.status)} className="text-xs">
                              {ticket.status}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="capitalize text-xs">
                            {ticket.priority} Priority
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-gray-700 mb-3 break-words">{ticket.description}</p>
                      
                      {ticket.updated_at !== ticket.created_at && (
                        <div className="text-[10px] sm:text-xs text-gray-500 border-t pt-2">
                          Last updated: {new Date(ticket.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}

                      {ticket.resolved_at && (
                        <div className="mt-3 p-2 sm:p-3 bg-green-50 rounded-lg">
                          <p className="text-xs sm:text-sm font-medium text-green-800">
                            ✓ Resolved on {new Date(ticket.resolved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="faqs" className="space-y-4 sm:space-y-6">
        {/* Search Bar */}
        <Card className="w-full">
          <CardContent className="p-3 sm:p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
              <Input
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 text-xs sm:text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* FAQs by Category */}
        {Object.keys(groupedFaqs).length === 0 ? (
          <Card className="w-full">
            <CardContent className="text-center py-6 sm:py-8 p-4">
              <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-gray-500">No FAQs found matching your search.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
              <Card key={category} className="w-full">
                <CardHeader className="p-4 sm:p-5 md:p-6">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                    <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span>{category} FAQs</span>
                    <Badge variant="outline" className="text-xs">{categoryFaqs.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 md:p-6">
                  <Accordion type="single" collapsible>
                    {categoryFaqs.map((faq) => (
                      <AccordionItem key={faq.id} value={faq.id.toString()}>
                        <AccordionTrigger className="text-left text-xs sm:text-sm break-words">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed break-words">{faq.answer}</p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="contact" className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {Object.entries(contactInfo).map(([key, info]) => (
            <Card key={key} className="w-full">
              <CardHeader className="p-4 sm:p-5 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  {key === 'technical' ? <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" /> :
                   key === 'financial' ? <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" /> :
                   <Phone className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />}
                  <span>{info.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-5 md:p-6">
                <div className="flex items-start gap-3">
                  <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600">Email</p>
                    <p className="font-medium text-xs sm:text-sm break-all">{info.email}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-xs sm:text-sm">{info.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600">Hours</p>
                    <p className="font-medium text-xs sm:text-sm break-words">{info.hours}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Emergency Contacts */}
        <Card className="border-l-4 border-red-500 w-full">
          <CardHeader className="p-4 sm:p-5 md:p-6">
            <CardTitle className="flex items-center gap-2 text-red-700 text-base sm:text-lg">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>Emergency Contacts</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h4 className="font-semibold text-sm sm:text-base mb-2">Campus Emergency</h4>
                <p className="text-lg sm:text-xl font-bold text-red-600">911</p>
                <p className="text-xs sm:text-sm text-gray-600">For immediate emergencies on campus</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base mb-2">Campus Security</h4>
                <p className="text-lg sm:text-xl font-bold">+91 9311013848</p>
                <p className="text-xs sm:text-sm text-gray-600">24/7 Campus Security Hotline</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base mb-2">Medical Center</h4>
                <p className="text-lg sm:text-xl font-bold">+91 9311013848</p>
                <p className="text-xs sm:text-sm text-gray-600">On-campus medical assistance</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base mb-2">Counseling Services</h4>
                <p className="text-lg sm:text-xl font-bold">+91 9311013848</p>
                <p className="text-xs sm:text-sm text-gray-600">Mental health and counseling support</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
);
};

// Support Ticket Dialog Component - Responsive
const SupportTicketDialog: React.FC<{
  onCreate: (category: string, title: string, description: string, priority: string) => void;
}> = ({ onCreate }) => {
  const [category, setCategory] = useState('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) return;

    onCreate(category, title, description, priority);
    setCategory('general');
    setTitle('');
    setDescription('');
    setPriority('normal');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="text-xs sm:text-sm">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
          Create Support Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Create Support Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs sm:text-sm font-medium">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="academic" className="text-xs sm:text-sm">Academic</SelectItem>
                <SelectItem value="technical" className="text-xs sm:text-sm">Technical</SelectItem>
                <SelectItem value="financial" className="text-xs sm:text-sm">Financial</SelectItem>
                <SelectItem value="hostel" className="text-xs sm:text-sm">Hostel</SelectItem>
                <SelectItem value="general" className="text-xs sm:text-sm">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs sm:text-sm font-medium">Title</label>
            <Input
              placeholder="Brief summary of the issue..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="text-xs sm:text-sm font-medium">Description</label>
            <Textarea
              placeholder="Detailed description of the issue and any steps you've already taken..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="text-xs sm:text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low" className="text-xs sm:text-sm">Low</SelectItem>
                <SelectItem value="normal" className="text-xs sm:text-sm">Normal</SelectItem>
                <SelectItem value="high" className="text-xs sm:text-sm">High</SelectItem>
                <SelectItem value="urgent" className="text-xs sm:text-sm">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-blue-800">
              <strong>Tip:</strong> For faster resolution, please provide as much detail as possible 
              including screenshots, error messages, or steps to reproduce the issue.
            </p>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={!title.trim() || !description.trim()}
            className="w-full text-xs sm:text-sm"
          >
            Submit Ticket
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupportHelp;
