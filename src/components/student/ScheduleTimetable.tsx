import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, MapPin, User, BookOpen, ChevronLeft, ChevronRight, Star, CalendarDays } from 'lucide-react';
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
  const [currentMobileDay, setCurrentMobileDay] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [hoveredClass, setHoveredClass] = useState<any>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number; showBelow?: boolean } | null>(null);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isHoveringRef = React.useRef<boolean>(false);
  const { toast } = useToast();

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];

  useEffect(() => {
    fetchScheduleData();
  }, [studentData, currentWeek, currentMobileDay]);

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

        // Mobile day range
        const mobileStart = new Date(currentMobileDay);
        mobileStart.setDate(mobileStart.getDate() - 3);
        const mobileEnd = new Date(currentMobileDay);
        mobileEnd.setDate(mobileEnd.getDate() + 3);

        const earliestDate = weekStart < mobileStart ? weekStart : mobileStart;
        const latestDate = weekEnd > mobileEnd ? weekEnd : mobileEnd;

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
          .gte('scheduled_date', earliestDate.toISOString().split('T')[0])
          .lte('scheduled_date', latestDate.toISOString().split('T')[0]);

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
    start.setDate(start.getDate() - start.getDay());

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

  const navigateMobileDay = (direction: 'prev' | 'next') => {
    const newDay = new Date(currentMobileDay);
    newDay.setDate(currentMobileDay.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentMobileDay(newDay);
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatTimeShort = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes}${ampm}`;
  };

  const timeToMinutes = (timeString: string) => {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
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

  const detectOverlaps = (classes: any[]) => {
    const sortedClasses = [...classes].sort((a, b) => 
      timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    );

    const overlaps = [];
    for (let i = 0; i < sortedClasses.length; i++) {
      const current = sortedClasses[i];
      const currentStart = timeToMinutes(current.start_time);
      const currentEnd = timeToMinutes(current.end_time);
      
      let overlapGroup = [current];
      
      for (let j = i + 1; j < sortedClasses.length; j++) {
        const next = sortedClasses[j];
        const nextStart = timeToMinutes(next.start_time);
        const nextEnd = timeToMinutes(next.end_time);
        
        // Check if there's overlap
        if (nextStart < currentEnd) {
          overlapGroup.push(next);
        }
      }
      
      if (overlapGroup.length > 1) {
        overlaps.push(overlapGroup);
      }
    }
    
    return overlaps;
  };

  const calculateOverlapPositions = (classes: any[]) => {
    const positions = new Map();
    const overlaps = detectOverlaps(classes);
    
    overlaps.forEach(group => {
      group.forEach((cls, index) => {
        positions.set(cls, {
          totalInGroup: group.length,
          position: index
        });
      });
    });
    
    return positions;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isClassActive = (classItem: any) => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    return currentTime >= classItem.start_time && currentTime <= classItem.end_time;
  };

  const getClassTypeStyle = (cls: any) => {
    if (!cls.is_extra_class) {
      return 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20';
    }
    
    switch (cls.class_type) {
      case 'extra':
        return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'remedial':
        return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100';
      case 'makeup':
        return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
      case 'special':
        return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
    }
  };

  const getClassPosition = (startTime: string, endTime: string) => {
    const dayStartMinutes = 0;
    const dayEndMinutes = 24 * 60;
    const totalMinutes = dayEndMinutes - dayStartMinutes;
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const duration = endMinutes - startMinutes;
    
    const topPercent = ((startMinutes - dayStartMinutes) / totalMinutes) * 100;
    const heightPercent = (duration / totalMinutes) * 100;
    
    return {
      top: `${Math.max(0, topPercent)}%`,
      height: `${Math.max(3, heightPercent)}%`,
      durationMinutes: duration
    };
  };

  const generateTimeLabels = () => {
    const labels = [];
    for (let hour = 0; hour < 25; hour++) {
      labels.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        display: formatTime(`${hour.toString().padStart(2, '0')}:00`)
      });
    }
    return labels;
  };

  const handleClassHover = (cls: any, event: React.MouseEvent) => {
    // If already hovering the same class, don't recalculate
    if (isHoveringRef.current && hoveredClass?.id === cls.id) {
      return;
    }
    
    // Mark that we're hovering
    isHoveringRef.current = true;
    
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const cardWidth = 320;
    const cardHeight = 240;
    
    // Calculate horizontal position
    let xPos = rect.left + rect.width / 2;
    
    // Prevent card from going off screen on the left
    if (xPos - cardWidth / 2 < 10) {
      xPos = cardWidth / 2 + 10;
    }
    
    // Prevent card from going off screen on the right
    if (xPos + cardWidth / 2 > viewportWidth - 10) {
      xPos = viewportWidth - cardWidth / 2 - 10;
    }
    
    // Calculate vertical position - show below if not enough space above
    let yPos = rect.top;
    let showBelow = false;
    
    // Add extra padding to prevent card from triggering leave events
    if (rect.top < cardHeight + 40) {
      // Not enough space above, show below
      yPos = rect.bottom;
      showBelow = true;
    }
    
    // Set immediately without delay to prevent flickering
    setHoveredClass(cls);
    setHoverPosition({
      x: xPos,
      y: yPos,
      showBelow: showBelow
    });
  };

  const handleClassLeave = () => {
    // Mark that we're not hovering anymore
    isHoveringRef.current = false;
    
    // Clear timeout if exists
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Add delay before hiding
    hoverTimeoutRef.current = setTimeout(() => {
      // Only hide if we're still not hovering
      if (!isHoveringRef.current) {
        setHoveredClass(null);
        setHoverPosition(null);
      }
    }, 200);
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
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0 relative">
        {/* Hover Card */}
        {hoveredClass && hoverPosition && (
          <div
            className="fixed z-[9999]"
            style={{
              left: `${hoverPosition.x}px`,
              top: `${hoverPosition.y}px`,
              transform: hoverPosition.showBelow 
                ? 'translate(-50%, 15px)' 
                : 'translate(-50%, calc(-100% - 10px))',
              pointerEvents: 'none',
              willChange: 'transform',
              isolation: 'isolate'
            }}
            onMouseEnter={() => {
              isHoveringRef.current = true;
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
            }}
          >
            <div className="bg-black border-1 border-primary shadow-xl rounded-lg p-2 w-80">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {hoveredClass.is_extra_class && (
                    <Star className="h-4 w-4 flex-shrink-0" />
                  )}
                  <h4 className="font-bold text-sm text-primary truncate">
                    {hoveredClass.course_code}
                  </h4>
                  {isClassActive(hoveredClass) && (
                    <Badge variant="default" className="text-xs flex-shrink-0">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium line-clamp-2">
                  {hoveredClass.course_name}
                </p>
                {hoveredClass.is_extra_class && hoveredClass.title && (
                  <p className="text-xs font-medium text-blue-600 line-clamp-1">
                    {hoveredClass.title}
                  </p>
                )}
                {hoveredClass.description && (
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {hoveredClass.description}
                  </p>
                )}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="font-medium">
                      {formatTime(hoveredClass.start_time)} - {formatTime(hoveredClass.end_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{hoveredClass.room_location || 'Room TBD'}</span>
                  </div>
                  {hoveredClass.instructor_name && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{hoveredClass.instructor_name}</span>
                    </div>
                  )}
                  {hoveredClass.is_extra_class && (
                    <div className="flex items-center gap-1 capitalize">
                      <Badge variant="outline" className="text-xs">
                        {hoveredClass.class_type}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <h2 className="text-2xl font-bold">Class Schedule</h2>
            <p className="text-muted-foreground">View your class schedule</p>
          </div>
        </div>

        <Tabs defaultValue="schedule" className="space-y-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-2">
            <TabsTrigger value="schedule" className="text-xs sm:text-sm">Schedule</TabsTrigger>
            <TabsTrigger value="daily" className="text-xs sm:text-sm">Daily</TabsTrigger>
          </TabsList>

          {/* Weekly/Daily Schedule View */}
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden lg:inline">Weekly Schedule Timeline</span>
                    <span className="lg:hidden">Daily Schedule</span>
                  </CardTitle>
                  
                  {/* Desktop Week Navigation */}
                  <div className="hidden lg:flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs sm:text-sm font-medium min-w-[100px] sm:min-w-[140px] text-center">
                      {currentWeek.toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Mobile Day Navigation */}
                  <div className="flex lg:hidden items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => navigateMobileDay('prev')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium min-w-[140px] text-center">
                      {currentMobileDay.toLocaleDateString('en-US', { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric' 
                      })}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => navigateMobileDay('next')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-visible">
                {/* Desktop View - Timeline */}
                <div className="hidden lg:grid grid-cols-8 gap-2 min-h-[800px]">
                  <div className="space-y-0 relative">
                    <div className="h-12"></div>
                    <div className="relative" style={{ height: 'calc(100% - 48px)' }}>
                      {generateTimeLabels().map((label, index) => (
                        <div 
                          key={label.time}
                          className="absolute text-xs text-muted-foreground w-full pr-2 text-right"
                          style={{ 
                            top: `${(index / (generateTimeLabels().length - 1)) * 100}%`,
                            transform: 'translateY(-50%)'
                          }}
                        >
                          {label.display}
                        </div>
                      ))}
                    </div>
                  </div>

                  {getWeekDays(currentWeek).map((date, dayIndex) => {
                    const dayClasses = getClassesForDay(dayIndex, date);
                    const overlapPositions = calculateOverlapPositions(dayClasses);
                    
                    return (
                      <div key={dayIndex} className="space-y-2">
                        <div className={`h-12 text-center p-2 rounded-lg ${
                          isToday(date) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          <div className="text-sm font-medium">{daysOfWeek[dayIndex]}</div>
                          <div className="text-xs">{date.getDate()}</div>
                        </div>
                        
                        <div className="relative border rounded-lg overflow-visible" style={{ height: 'calc(100% - 56px)', minHeight: '700px' }}>
                          {generateTimeLabels().map((_, index) => (
                            <div 
                              key={index}
                              className="absolute w-full border-t border-muted"
                              style={{ top: `${(index / (generateTimeLabels().length - 1)) * 100}%` }}
                            />
                          ))}
                          
                          {dayClasses.map((cls, clsIndex) => {
                            const position = getClassPosition(cls.start_time, cls.end_time);
                            const active = isClassActive(cls);
                            const overlapInfo = overlapPositions.get(cls);
                            
                            // Calculate width and left offset for overlapping classes
                            let widthPercent = 100;
                            let leftPercent = 0;
                            
                            if (overlapInfo) {
                              widthPercent = 100 / overlapInfo.totalInGroup;
                              leftPercent = widthPercent * overlapInfo.position;
                            }
                            
                            // Determine if class is too small to show details
                            const isSmallSlot = position.durationMinutes < 45;
                            const isVerySmallSlot = position.durationMinutes < 30;
                            
                            return (
                              <div 
                                key={clsIndex}
                                className={`absolute p-1.5 rounded text-xs border cursor-pointer transition-colors duration-150 overflow-hidden ${getClassTypeStyle(cls)} ${
                                  active ? 'ring-2 ring-offset-1' : ''
                                }`}
                                style={{
                                  top: position.top,
                                  height: position.height,
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent - 1}%`,
                                  minHeight: '28px'
                                }}
                                onMouseEnter={(e) => {
                                  e.stopPropagation();
                                  handleClassHover(cls, e);
                                }}
                                onMouseLeave={(e) => {
                                  e.stopPropagation();
                                  handleClassLeave();
                                }}
                              >
                                {isVerySmallSlot ? (
                                  // Very small slot - only show course code
                                  <div className="flex items-center justify-center h-full pointer-events-none">
                                    <div className="font-semibold text-[10px] truncate flex items-center gap-0.5">
                                      {cls.is_extra_class && (
                                        <Star className="h-2 w-2 flex-shrink-0" />
                                      )}
                                      <span className="truncate">{cls.course_code}</span>
                                    </div>
                                  </div>
                                ) : isSmallSlot ? (
                                  // Small slot - show code and time
                                  <div className="space-y-0.5 pointer-events-none">
                                    <div className="font-medium text-[10px] truncate flex items-center gap-0.5">
                                      {cls.is_extra_class && (
                                        <Star className="h-2 w-2 flex-shrink-0" />
                                      )}
                                      <span className="truncate">{cls.course_code}</span>
                                    </div>
                                    <div className="text-[9px] truncate">
                                      {formatTimeShort(cls.start_time)}
                                    </div>
                                  </div>
                                ) : (
                                  // Normal slot - show all details
                                  <div className="space-y-0.5 pointer-events-none">
                                    <div className="font-medium text-[10px] truncate flex items-center gap-0.5">
                                      {cls.is_extra_class && (
                                        <Star className="h-2 w-2 flex-shrink-0" />
                                      )}
                                      <span className="truncate">{cls.course_code}</span>
                                    </div>
                                    <div className="text-[9px] truncate">
                                      {formatTimeShort(cls.start_time)}
                                    </div>
                                    {position.durationMinutes >= 60 && (
                                      <>
                                        <div className="text-[9px] truncate">
                                          {cls.room_location || 'TBD'}
                                        </div>
                                        {cls.is_extra_class && position.durationMinutes >= 75 && (
                                          <div className="text-[9px] truncate capitalize">
                                            {cls.class_type}
                                          </div>
                                        )}
                                      </>
                                    )}
                                    {active && position.durationMinutes >= 60 && (
                                      <div className="text-[9px] font-semibold text-green-600 pointer-events-none">
                                        ACTIVE
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile View - Daily List Format */}
                <div className="lg:hidden space-y-3">
                  <div className={`p-4 rounded-lg ${
                    isToday(currentMobileDay) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <div className="text-lg font-semibold">
                      {currentMobileDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    {isToday(currentMobileDay) && (
                      <div className="text-sm mt-1">Today</div>
                    )}
                  </div>
                  
                  {(() => {
                    const mobileDayOfWeek = currentMobileDay.getDay();
                    const dayClasses = getClassesForDay(mobileDayOfWeek, currentMobileDay);
                    
                    if (dayClasses.length === 0) {
                      return (
                        <div className="text-center py-12 text-muted-foreground">
                          <CalendarDays className="h-12 w-12 mx-auto mb-3" />
                          <p className="font-medium">No classes scheduled</p>
                          <p className="text-sm mt-1">You have no classes on this day</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {dayClasses.map((cls, clsIndex) => {
                          const active = isClassActive(cls);
                          return (
                            <div 
                              key={clsIndex}
                              className={`p-4 rounded-lg border ${getClassTypeStyle(cls)} ${
                                active ? 'ring-2 ring-primary' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    {cls.is_extra_class && (
                                      <Star className="h-4 w-4 flex-shrink-0" />
                                    )}
                                    <span className="font-bold text-base truncate">{cls.course_code}</span>
                                    {active && (
                                      <Badge className="text-xs" variant="default">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Active
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm font-medium truncate mb-3">{cls.course_name}</div>
                                  {cls.is_extra_class && cls.title && (
                                    <div className="text-sm font-medium mb-2 truncate">{cls.title}</div>
                                  )}
                                  {cls.description && (
                                    <p className="text-xs mb-3 line-clamp-2">{cls.description}</p>
                                  )}
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      <span className="font-medium">{formatTime(cls.start_time)} - {formatTime(cls.end_time)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      <span>{cls.room_location || 'Room TBD'}</span>
                                    </div>
                                    {cls.instructor_name && (
                                      <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        <span>{cls.instructor_name}</span>
                                      </div>
                                    )}
                                    {cls.is_extra_class && (
                                      <div className="text-xs mt-2 capitalize font-medium">
                                        {cls.class_type} class
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily View */}
          <TabsContent value="daily" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Today's Classes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {todayClasses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
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
        </Tabs>
      </div>
    </PermissionWrapper>
  );
};

export default ScheduleTimetable;