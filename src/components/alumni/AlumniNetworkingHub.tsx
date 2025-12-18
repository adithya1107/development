import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

interface AlumniNetworkingHubProps {
  alumniData: any;
}

const AlumniNetworkingHub = ({ alumniData }: AlumniNetworkingHubProps) => {
  // Forum state
  const [forumName, setForumName] = useState("");
  const [forumCategory, setForumCategory] = useState("networking");

  // Event state
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("online");
  const [meetLink, setMeetLink] = useState("");
  const [venue, setVenue] = useState("");

  const handleCreateForum = () => {
    if (!forumName) {
      toast({ title: "Missing", description: "Forum name required", variant: "destructive" });
      return;
    }

    toast({
      title: "Forum Created",
      description: `Forum "${forumName}" created under ${forumCategory}`
    });

    setForumName("");
  };

  const handleCreateEvent = () => {
    if (!eventName) {
      toast({ title: "Missing", description: "Event name required", variant: "destructive" });
      return;
    }

    toast({
      title: "Event Created",
      description: `${eventName} (${eventType}) created successfully`
    });

    setEventName("");
    setMeetLink("");
    setVenue("");
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <Card>
        <CardHeader>
          <CardTitle>Alumni Networking Hub</CardTitle>
        </CardHeader>
        <CardContent>
          Welcome, {alumniData?.first_name}!  
          Manage forums, events, and collaboration here.
        </CardContent>
      </Card>

      {/* CREATE FORUM */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Forum</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Forum Name"
            value={forumName}
            onChange={(e) => setForumName(e.target.value)}
          />

          <Select value={forumCategory} onValueChange={setForumCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="networking">Networking</SelectItem>
              <SelectItem value="career">Career</SelectItem>
              <SelectItem value="mentorship">Mentorship</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleCreateForum}>Create Forum</Button>
        </CardContent>
      </Card>

      {/* CREATE EVENT */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Event</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Input
            placeholder="Event Name"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />

          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger>
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>

          {/* OPTIONAL FIELDS */}
          {eventType !== "offline" && (
            <Input
              placeholder="Google Meet Link"
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
            />
          )}

          {eventType !== "online" && (
            <Textarea
              placeholder="Venue Details"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
          )}

          <Button onClick={handleCreateEvent}>Create Event</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlumniNetworkingHub;
