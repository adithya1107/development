import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, MapPin, User, BookOpen, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PermissionWrapper from '@/components/PermissionWrapper';

interface ScheduleTimetableProps {
  studentData: any;
}

const ScheduleTimetable: React.FC<ScheduleTimetableProps> = ({ studentData }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weeklySchedule, setWeeklySchedule] = useState<any[]>([]);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const timeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
  ];

  useEffect(() => {
    fetchScheduleData();
  }, [studentData, currentWeek]);

  const fetchScheduleData = async () => {
    if (!studentData?.user_id) return;

    setLoading(true);
    try {
      // Get enrolled courses with regular schedule
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select(`
          course_id,
          courses!inner (
            id,
            course_name,
            course_code,
            instructor_id,
            user_profiles!courses_instructor_id_fkey (
              first_name,
              last_name
            ),
            class_schedule (
              day_of_week,
              start_time,
              end_time,
              room_location
            )
          )
        `)
        .eq('student_id', studentData.user_id)
        .eq('status', 'enrolled');

      if (enrollmentError) {
        console.error('Enrollment fetch error:', enrollmentError);
        throw enrollmentError;
      }

      let allScheduleData = [];

      // Process regular classes
      if (enrollments) {
        const regularSchedule = enrollments.flatMap(enrollment => 
          enrollment.courses.class_schedule.map(schedule => ({
            ...schedule,
            course_name: enrollment.courses.course_name,
            course_code: enrollment.courses.course_code,
            instructor_name: `${enrollment.courses.user_profiles?.first_name || ''} ${enrollment.courses.user_profiles?.last_name || ''}`.trim(),
            course_id: enrollment.courses.id,
            is_extra_class: false,
            class_type: 'regular'
          }))
        );
        allScheduleData = [...regularSchedule];
      }

      // Get enrolled course IDs for extra class lookup
      const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];

      if (enrolledCourseIds.length > 0) {
        // Calculate week start and end dates
        const weekStart = new Date(currentWeek);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        // Get extra classes for the current week
        const { data: extraClasses, error: extraError } = await supabase
          .from('extra_class_schedule')
          .select(`
            id,
            course_id,
            teacher_id,
            title,
            description,
            scheduled_date,
            start_time,
            end_time,
            room_location,
            class_type,
            status,
            courses (
              course_name,
              course_code
            )
          `)
          .in('course_id', enrolledCourseIds)
          .eq('status', 'scheduled')
          .gte('scheduled_date', weekStart.toISOString().split('T')[0])
          .lte('scheduled_date', weekEnd.toISOString().split('T')[0]);

        // If we have extra classes, get teacher information separately
        let teacherProfiles = {};
        if (extraClasses && extraClasses.length > 0) {
          const teacherIds = [...new Set(extraClasses.map(ec => ec.teacher_id))];
          const { data: teachers } = await supabase
            .from('user_profiles')
            .select('user_id, first_name, last_name')
            .in('user_id', teacherIds);
          
          if (teachers) {
            teacherProfiles = teachers.reduce((acc, teacher) => {
              acc[teacher.user_id] = teacher;
              return acc;
            }, {});
          }
        }

        if (extraError) {
          console.warn('Extra class fetch error:', extraError);
        } else if (extraClasses && extraClasses.length > 0) {
          // Process extra classes
          const extraScheduleData = extraClasses.map(extraClass => {
            const scheduledDate = new Date(extraClass.scheduled_date);
            const teacher = teacherProfiles[extraClass.teacher_id];
            return {
              id: extraClass.id,
              day_of_week: scheduledDate.getDay(),
              scheduled_date: extraClass.scheduled_date,
              start_time: extraClass.start_time,
              end_time: extraClass.end_time,
              room_location: extraClass.room_location || '',
              course_name: extraClass.courses?.course_name || extraClass.title,
              course_code: extraClass.courses?.course_code || 'EXTRA',
              instructor_name: teacher ? `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() : '',
              course_id: extraClass.course_id,
              class_type: extraClass.class_type,
              title: extraClass.title,
              description: extraClass.description,
              status: extraClass.status,
              is_extra_class: true
            };
          });
          
          allScheduleData = [...allScheduleData, ...extraScheduleData];
        }
      }

      setWeeklySchedule(allScheduleData);

      // Filter today's classes
      const today = new Date();
      const todaySchedule = allScheduleData.filter(cls => {
        if (cls.is_extra_class && cls.scheduled_date) {
          const classDate = new Date(cls.scheduled_date);
          return classDate.toDateString() === today.toDateString();
        }
        return cls.day_of_week === today.getDay();
      });
      setTodayClasses(todaySchedule.sort((a, b) => a.start_time.localeCompare(b.start_time)));

    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to load schedule data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = (startDate: Date) => {
    const week = [];
    const start = new Date(startDate);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getClassesForDay = (dayOfWeek: number, specificDate?: Date) => {
    return weeklySchedule.filter(cls => {
      if (cls.is_extra_class && cls.scheduled_date && specificDate) {
        const classDate = new Date(cls.scheduled_date);
        return classDate.toDateString() === specificDate.toDateString();
      }
      return cls.day_of_week === dayOfWeek;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getClassTypeStyle = (cls: any) => {
    if (!cls.is_extra_class) {
      return 'bg-primary/10 text-primary border-primary/20';
    }
    
    switch (cls.class_type) {
      case 'extra':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'remedial':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'makeup':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'special':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PermissionWrapper permission="view_attendance">
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Schedule & Timetable</h2>
            <p className="text-sm text-muted-foreground">View your class schedule including extra classes</p>
          </div>
        </div>

        <Tabs defaultValue="daily" className="space-y-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-3">
            <TabsTrigger value="daily" className="text-xs sm:text-sm">Daily</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs sm:text-sm">Weekly</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs sm:text-sm">Calendar</TabsTrigger>
          </TabsList>

          {/* Daily View - Now default for mobile */}
          <TabsContent value="daily" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Today's Classes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {todayClasses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No classes scheduled for today
                  </div>
                ) : (
                  todayClasses.map((cls, index) => (
                    <div key={index} className={`flex items-start space-x-3 p-3 sm:p-4 border rounded-lg ${
                      cls.is_extra_class ? 'border-l-4 border-l-blue-500' : ''
                    }`}>
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${
                          cls.is_extra_class 
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {cls.is_extra_class ? (
                            <Star className="h-5 w-5 sm:h-6 sm:w-6" />
                          ) : (
                            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-sm sm:text-base">{cls.course_name}</h3>
                          {cls.is_extra_class && (
                            <Badge variant="secondary" className="text-xs capitalize">
                              {cls.class_type}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {cls.course_code}
                          {cls.is_extra_class && cls.title && ` • ${cls.title}`}
                        </p>
                        {cls.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cls.description}</p>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 text-xs text-muted-foreground gap-1 sm:gap-0">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{formatTime(cls.start_time)} - {formatTime(cls.end_time)}</span>
                          </span>
                          {cls.room_location && (
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{cls.room_location}</span>
                            </span>
                          )}
                          {cls.instructor_name && (
                            <span className="flex items-center">
                              <User className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{cls.instructor_name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weekly View */}
          <TabsContent value="weekly" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-lg sm:text-xl">Weekly Schedule</CardTitle>
                  <div className="flex items-center justify-between sm:justify-start space-x-2">
                    <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs sm:text-sm font-medium px-2">
                      {currentWeek.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {/* Mobile/Tablet: List view */}
                <div className="block lg:hidden space-y-4">
                  {getWeekDays(currentWeek).map((date, dayIndex) => {
                    const dayClasses = getClassesForDay(dayIndex, date);
                    return (
                      <div key={dayIndex} className="border rounded-lg overflow-hidden">
                        <div className={`p-3 ${
                          isToday(date) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium">{daysOfWeek[dayIndex]}</div>
                              <div className="text-xs opacity-80">
                                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-3 space-y-2">
                          {dayClasses.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">No classes</p>
                          ) : (
                            dayClasses
                              .sort((a, b) => a.start_time.localeCompare(b.start_time))
                              .map((cls, clsIndex) => (
                                <div key={clsIndex} className={`p-2 rounded border text-xs ${getClassTypeStyle(cls)}`}>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1 min-w-0">
                                      {cls.is_extra_class && (
                                        <Star className="h-3 w-3 flex-shrink-0" />
                                      )}
                                      <span className="font-medium truncate">{cls.course_code}</span>
                                    </div>
                                    <span className="text-xs whitespace-nowrap">
                                      {formatTime(cls.start_time)}
                                    </span>
                                  </div>
                                  {cls.room_location && (
                                    <div className="text-xs opacity-80 mt-1 truncate">
                                      📍 {cls.room_location}
                                    </div>
                                  )}
                                  {cls.is_extra_class && (
                                    <div className="text-xs opacity-70 mt-1 capitalize">
                                      {cls.class_type}
                                    </div>
                                  )}
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop: Grid view */}
                <div className="hidden lg:grid lg:grid-cols-8 gap-2 min-w-max">
                  {/* Time column */}
                  <div className="space-y-2">
                    <div className="h-12"></div>
                    {timeSlots.map(time => (
                      <div key={time} className="h-16 text-xs text-muted-foreground flex items-center">
                        {time}
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {getWeekDays(currentWeek).map((date, dayIndex) => (
                    <div key={dayIndex} className="space-y-2">
                      <div className={`h-12 text-center p-2 rounded-lg ${
                        isToday(date) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <div className="text-sm font-medium">{daysOfWeek[dayIndex]}</div>
                        <div className="text-xs">{date.getDate()}</div>
                      </div>
                      
                      {timeSlots.map((timeSlot, timeIndex) => {
                        const dayClasses = getClassesForDay(dayIndex, date);
                        const classAtTime = dayClasses.find(cls => {
                          const startTime = formatTime(cls.start_time);
                          return startTime === timeSlot;
                        });

                        return (
                          <div key={timeIndex} className="h-16 border rounded">
                            {classAtTime && (
                              <div className={`p-1 rounded text-xs h-full border ${getClassTypeStyle(classAtTime)}`}>
                                <div className="font-medium truncate flex items-center">
                                  {classAtTime.is_extra_class && (
                                    <Star className="h-2 w-2 mr-1 flex-shrink-0" />
                                  )}
                                  <span className="truncate">{classAtTime.course_code}</span>
                                </div>
                                <div className="text-xs opacity-80 truncate">
                                  {classAtTime.room_location}
                                </div>
                                {classAtTime.is_extra_class && (
                                  <div className="text-xs opacity-70 truncate capitalize">
                                    {classAtTime.class_type}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar View */}
          <TabsContent value="calendar" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg sm:text-xl">Select Date</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getClassesForDay(selectedDate.getDay(), selectedDate).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No classes scheduled for this day
                    </div>
                  ) : (
                    getClassesForDay(selectedDate.getDay(), selectedDate)
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((cls, index) => (
                      <div key={index} className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg ${
                        cls.is_extra_class ? 'border-l-4 border-l-blue-500' : ''
                      }`}>
                        <div className="flex-shrink-0 flex gap-2">
                          <Badge variant={cls.is_extra_class ? "secondary" : "outline"} className="text-xs">
                            {cls.course_code}
                          </Badge>
                          {cls.is_extra_class && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {cls.class_type}
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm sm:text-base">{cls.course_name}</h4>
                            {cls.is_extra_class && (
                              <Star className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          {cls.is_extra_class && cls.title && (
                            <p className="text-xs sm:text-sm text-blue-600 font-medium">{cls.title}</p>
                          )}
                          {cls.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{cls.description}</p>
                          )}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 text-xs sm:text-sm text-muted-foreground gap-1 sm:gap-0">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{formatTime(cls.start_time)} - {formatTime(cls.end_time)}</span>
                            </span>
                            {cls.room_location && (
                              <span className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{cls.room_location}</span>
                              </span>
                            )}
                            {cls.instructor_name && (
                              <span className="flex items-center">
                                <User className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{cls.instructor_name}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
};

export default ScheduleTimetable;