export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      absence_requests: {
        Row: {
          absence_date: string
          course_id: string
          id: string
          reason: string
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          absence_date: string
          course_id: string
          id?: string
          reason: string
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          absence_date?: string
          course_id?: string
          id?: string
          reason?: string
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "absence_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_roles: {
        Row: {
          admin_role_type: Database["public"]["Enums"]["admin_role_type"]
          assigned_at: string | null
          assigned_by: string | null
          college_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          permissions: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_role_type: Database["public"]["Enums"]["admin_role_type"]
          assigned_at?: string | null
          assigned_by?: string | null
          college_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_role_type?: Database["public"]["Enums"]["admin_role_type"]
          assigned_at?: string | null
          assigned_by?: string | null
          college_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_roles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_contributions: {
        Row: {
          alumnus_id: string
          amount: number | null
          college_id: string
          completed_at: string | null
          contribution_type: string
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          is_anonymous: boolean | null
          payment_method: string | null
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          alumnus_id: string
          amount?: number | null
          college_id: string
          completed_at?: string | null
          contribution_type: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_anonymous?: boolean | null
          payment_method?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          alumnus_id?: string
          amount?: number | null
          college_id?: string
          completed_at?: string | null
          contribution_type?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_anonymous?: boolean | null
          payment_method?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumni_contributions_alumnus_id_fkey"
            columns: ["alumnus_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_contributions_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_forum_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          forum_id: string
          id: string
          is_pinned: boolean | null
          parent_post_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          forum_id: string
          id?: string
          is_pinned?: boolean | null
          parent_post_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          forum_id?: string
          id?: string
          is_pinned?: boolean | null
          parent_post_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumni_forum_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_forum_posts_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "alumni_forums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_forum_posts_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "alumni_forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_forums: {
        Row: {
          category: string
          college_id: string
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          title: string
        }
        Insert: {
          category: string
          college_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          title: string
        }
        Update: {
          category?: string
          college_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumni_forums_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_forums_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_network_members: {
        Row: {
          id: string
          joined_at: string | null
          network_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          network_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          network_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumni_network_members_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "alumni_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_network_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_networks: {
        Row: {
          category: string
          college_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          category: string
          college_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          category?: string
          college_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumni_networks_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_networks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_news: {
        Row: {
          author_id: string
          college_id: string
          content: string
          created_at: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          published_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          college_id: string
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          published_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          college_id?: string
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          published_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumni_news_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_news_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_metrics: {
        Row: {
          academic_year: string | null
          college_id: string
          id: string
          metric_data: Json
          metric_type: string
          recorded_at: string | null
          semester: string | null
        }
        Insert: {
          academic_year?: string | null
          college_id: string
          id?: string
          metric_data: Json
          metric_type: string
          recorded_at?: string | null
          semester?: string | null
        }
        Update: {
          academic_year?: string | null
          college_id?: string
          id?: string
          metric_data?: Json
          metric_type?: string
          recorded_at?: string | null
          semester?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_metrics_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          announcement_type: string | null
          college_id: string
          content: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          priority: string | null
          target_audience: Json | null
          title: string
        }
        Insert: {
          announcement_type?: string | null
          college_id: string
          content: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          target_audience?: Json | null
          title: string
        }
        Update: {
          announcement_type?: string | null
          college_id?: string
          content?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          target_audience?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          feedback: string | null
          file_url: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          marks_obtained: number | null
          student_id: string
          submission_text: string | null
          submitted_at: string | null
        }
        Insert: {
          assignment_id: string
          feedback?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          marks_obtained?: number | null
          student_id: string
          submission_text?: string | null
          submitted_at?: string | null
        }
        Update: {
          assignment_id?: string
          feedback?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          marks_obtained?: number | null
          student_id?: string
          submission_text?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          course_id: string
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string
          id: string
          max_marks: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date: string
          id?: string
          max_marks?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string
          id?: string
          max_marks?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_date: string
          course_id: string
          device_info: Json | null
          id: string
          location_verified: boolean | null
          marked_at: string | null
          marked_by: string | null
          session_id: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          class_date: string
          course_id: string
          device_info?: Json | null
          id?: string
          location_verified?: boolean | null
          marked_at?: string | null
          marked_by?: string | null
          session_id?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          class_date?: string
          course_id?: string
          device_info?: Json | null
          id?: string
          location_verified?: boolean | null
          marked_at?: string | null
          marked_by?: string | null
          session_id?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          course_id: string
          created_at: string | null
          end_time: string
          id: string
          instructor_id: string
          is_active: boolean | null
          qr_code: string | null
          room_id: string | null
          room_location: string | null
          session_date: string
          session_type: string | null
          start_time: string
          topic: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          end_time: string
          id?: string
          instructor_id: string
          is_active?: boolean | null
          qr_code?: string | null
          room_id?: string | null
          room_location?: string | null
          session_date: string
          session_type?: string | null
          start_time: string
          topic?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          instructor_id?: string
          is_active?: boolean | null
          qr_code?: string | null
          room_id?: string | null
          room_location?: string | null
          session_date?: string
          session_type?: string | null
          start_time?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_description: string | null
          action_type: string
          admin_user_id: string
          college_id: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          module: string | null
          new_values: Json | null
          old_values: Json | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_description?: string | null
          action_type: string
          admin_user_id: string
          college_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          module?: string | null
          new_values?: Json | null
          old_values?: Json | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_description?: string | null
          action_type?: string
          admin_user_id?: string
          college_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          module?: string | null
          new_values?: Json | null
          old_values?: Json | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_operations: {
        Row: {
          admin_user_id: string
          college_id: string
          completed_at: string | null
          created_at: string | null
          error_details: Json | null
          failed_records: number | null
          file_name: string | null
          id: string
          operation_type: string
          status: string | null
          successful_records: number | null
          total_records: number | null
        }
        Insert: {
          admin_user_id: string
          college_id: string
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          failed_records?: number | null
          file_name?: string | null
          id?: string
          operation_type: string
          status?: string | null
          successful_records?: number | null
          total_records?: number | null
        }
        Update: {
          admin_user_id?: string
          college_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          failed_records?: number | null
          file_name?: string | null
          id?: string
          operation_type?: string
          status?: string | null
          successful_records?: number | null
          total_records?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_operations_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_operations_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_type: string | null
          certificate_url: string | null
          course_id: string
          id: string
          is_active: boolean | null
          issued_by: string
          issued_date: string | null
          student_id: string
        }
        Insert: {
          certificate_type?: string | null
          certificate_url?: string | null
          course_id: string
          id?: string
          is_active?: boolean | null
          issued_by: string
          issued_date?: string | null
          student_id: string
        }
        Update: {
          certificate_type?: string | null
          certificate_url?: string | null
          course_id?: string
          id?: string
          is_active?: boolean | null
          issued_by?: string
          issued_date?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "communication_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedule: {
        Row: {
          course_id: string
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          room_location: string | null
          start_time: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          room_location?: string | null
          start_time: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          room_location?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedule_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          code: string
          created_at: string | null
          id: string
          logo: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          logo?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          logo?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      communication_channels: {
        Row: {
          channel_name: string
          channel_type: string
          college_id: string
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
        }
        Insert: {
          channel_name: string
          channel_type: string
          college_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
        }
        Update: {
          channel_name?: string
          channel_type?: string
          college_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
        }
        Relationships: []
      }
      communications: {
        Row: {
          college_id: string
          communication_type: string
          content: string
          created_at: string | null
          delivery_stats: Json | null
          id: string
          scheduled_at: string | null
          sender_id: string
          sent_at: string | null
          status: string | null
          target_audience: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          college_id: string
          communication_type: string
          content: string
          created_at?: string | null
          delivery_stats?: Json | null
          id?: string
          scheduled_at?: string | null
          sender_id: string
          sent_at?: string | null
          status?: string | null
          target_audience?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          college_id?: string
          communication_type?: string
          content?: string
          created_at?: string | null
          delivery_stats?: Json | null
          id?: string
          scheduled_at?: string | null
          sender_id?: string
          sent_at?: string | null
          status?: string | null
          target_audience?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_resources: {
        Row: {
          access_level: string | null
          category: string | null
          college_id: string
          content_type: string
          content_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          target_users: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          access_level?: string | null
          category?: string | null
          college_id: string
          content_type: string
          content_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          target_users?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string | null
          category?: string | null
          college_id?: string
          content_type?: string
          content_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          target_users?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_resources_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          academic_year: string | null
          college_id: string
          course_code: string
          course_name: string
          created_at: string | null
          credits: number | null
          description: string | null
          id: string
          instructor_id: string | null
          is_active: boolean | null
          max_students: number | null
          semester: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year?: string | null
          college_id: string
          course_code: string
          course_name: string
          created_at?: string | null
          credits?: number | null
          description?: string | null
          id?: string
          instructor_id?: string | null
          is_active?: boolean | null
          max_students?: number | null
          semester?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year?: string | null
          college_id?: string
          course_code?: string
          course_name?: string
          created_at?: string | null
          credits?: number | null
          description?: string | null
          id?: string
          instructor_id?: string | null
          is_active?: boolean | null
          max_students?: number | null
          semester?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_forums: {
        Row: {
          course_id: string
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_forums_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_forums_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requests: {
        Row: {
          college_id: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_method: string | null
          document_type: string
          document_url: string | null
          fee_amount: number | null
          id: string
          payment_status: string | null
          processed_at: string | null
          processed_by: string | null
          purpose: string | null
          status: string | null
          submitted_at: string | null
          tracking_id: string | null
          user_id: string
        }
        Insert: {
          college_id: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_method?: string | null
          document_type: string
          document_url?: string | null
          fee_amount?: number | null
          id?: string
          payment_status?: string | null
          processed_at?: string | null
          processed_by?: string | null
          purpose?: string | null
          status?: string | null
          submitted_at?: string | null
          tracking_id?: string | null
          user_id: string
        }
        Update: {
          college_id?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_method?: string | null
          document_type?: string
          document_url?: string | null
          fee_amount?: number | null
          id?: string
          payment_status?: string | null
          processed_at?: string | null
          processed_by?: string | null
          purpose?: string | null
          status?: string | null
          submitted_at?: string | null
          tracking_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string | null
          enrollment_date: string | null
          grade: string | null
          id: string
          status: string | null
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          enrollment_date?: string | null
          grade?: string | null
          id?: string
          status?: string | null
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          enrollment_date?: string | null
          grade?: string | null
          id?: string
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          additional_info: Json | null
          event_id: string
          id: string
          registration_date: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          additional_info?: Json | null
          event_id: string
          id?: string
          registration_date?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          additional_info?: Json | null
          event_id?: string
          id?: string
          registration_date?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          college_id: string
          created_at: string | null
          description: string | null
          end_date: string
          event_name: string
          event_type: string | null
          id: string
          is_active: boolean | null
          location: string | null
          max_participants: number | null
          organizer_id: string | null
          registration_required: boolean | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          college_id: string
          created_at?: string | null
          description?: string | null
          end_date: string
          event_name: string
          event_type?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          max_participants?: number | null
          organizer_id?: string | null
          registration_required?: boolean | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          college_id?: string
          created_at?: string | null
          description?: string | null
          end_date?: string
          event_name?: string
          event_type?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          max_participants?: number | null
          organizer_id?: string | null
          registration_required?: boolean | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_enrollments: {
        Row: {
          created_at: string | null
          exam_id: string
          grade: string | null
          hall_ticket_number: string | null
          id: string
          is_present: boolean | null
          marks_obtained: number | null
          seat_number: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          created_at?: string | null
          exam_id: string
          grade?: string | null
          hall_ticket_number?: string | null
          id?: string
          is_present?: boolean | null
          marks_obtained?: number | null
          seat_number?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          created_at?: string | null
          exam_id?: string
          grade?: string | null
          hall_ticket_number?: string | null
          id?: string
          is_present?: boolean | null
          marks_obtained?: number | null
          seat_number?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_enrollments_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "examinations"
            referencedColumns: ["id"]
          },
        ]
      }
      examinations: {
        Row: {
          course_id: string
          created_at: string | null
          created_by: string
          duration_minutes: number
          end_time: string
          exam_date: string
          exam_name: string
          exam_type: string
          id: string
          instructions: string | null
          is_active: boolean | null
          proctoring_enabled: boolean | null
          proctoring_settings_id: string | null
          room_id: string | null
          start_time: string
          total_marks: number
        }
        Insert: {
          course_id: string
          created_at?: string | null
          created_by: string
          duration_minutes: number
          end_time: string
          exam_date: string
          exam_name: string
          exam_type: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          proctoring_enabled?: boolean | null
          proctoring_settings_id?: string | null
          room_id?: string | null
          start_time: string
          total_marks: number
        }
        Update: {
          course_id?: string
          created_at?: string | null
          created_by?: string
          duration_minutes?: number
          end_time?: string
          exam_date?: string
          exam_name?: string
          exam_type?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          proctoring_enabled?: boolean | null
          proctoring_settings_id?: string | null
          room_id?: string | null
          start_time?: string
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "examinations_proctoring_settings_id_fkey"
            columns: ["proctoring_settings_id"]
            isOneToOne: false
            referencedRelation: "proctoring_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examinations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          amenities: Json | null
          capacity: number | null
          college_id: string
          created_at: string | null
          facility_name: string
          facility_type: string
          id: string
          is_available: boolean | null
          location: string | null
          maintenance_schedule: Json | null
          updated_at: string | null
        }
        Insert: {
          amenities?: Json | null
          capacity?: number | null
          college_id: string
          created_at?: string | null
          facility_name: string
          facility_type: string
          id?: string
          is_available?: boolean | null
          location?: string | null
          maintenance_schedule?: Json | null
          updated_at?: string | null
        }
        Update: {
          amenities?: Json | null
          capacity?: number | null
          college_id?: string
          created_at?: string | null
          facility_name?: string
          facility_type?: string
          id?: string
          is_available?: boolean | null
          location?: string | null
          maintenance_schedule?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facilities_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_requests: {
        Row: {
          assigned_to: string | null
          description: string
          facility_id: string | null
          id: string
          priority: string | null
          request_type: string
          resolved_at: string | null
          response: string | null
          status: string | null
          student_id: string
          submitted_at: string | null
          title: string
        }
        Insert: {
          assigned_to?: string | null
          description: string
          facility_id?: string | null
          id?: string
          priority?: string | null
          request_type: string
          resolved_at?: string | null
          response?: string | null
          status?: string | null
          student_id: string
          submitted_at?: string | null
          title: string
        }
        Update: {
          assigned_to?: string | null
          description?: string
          facility_id?: string | null
          id?: string
          priority?: string | null
          request_type?: string
          resolved_at?: string | null
          response?: string | null
          status?: string | null
          student_id?: string
          submitted_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_requests_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount_paid: number
          college_id: string
          created_at: string | null
          fee_structure_id: string
          id: string
          payment_date: string | null
          payment_method: string | null
          status: string | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          college_id: string
          created_at?: string | null
          fee_structure_id: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          status?: string | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          college_id?: string
          created_at?: string | null
          fee_structure_id?: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          status?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_reminders: {
        Row: {
          created_at: string | null
          due_amount: number
          due_date: string
          fee_structure_id: string
          id: string
          reminder_sent: boolean | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          due_amount: number
          due_date: string
          fee_structure_id: string
          id?: string
          reminder_sent?: boolean | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          due_amount?: number
          due_date?: string
          fee_structure_id?: string
          id?: string
          reminder_sent?: boolean | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_reminders_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year: string
          amount: number
          college_id: string
          created_at: string | null
          fee_type: string
          id: string
          is_active: boolean | null
          semester: string | null
          updated_at: string | null
          user_type: string | null
        }
        Insert: {
          academic_year: string
          amount: number
          college_id: string
          created_at?: string | null
          fee_type: string
          id?: string
          is_active?: boolean | null
          semester?: string | null
          updated_at?: string | null
          user_type?: string | null
        }
        Update: {
          academic_year?: string
          amount?: number
          college_id?: string
          created_at?: string | null
          fee_type?: string
          id?: string
          is_active?: boolean | null
          semester?: string | null
          updated_at?: string | null
          user_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_transactions: {
        Row: {
          amount: number
          college_id: string
          created_at: string | null
          currency: string | null
          due_date: string | null
          fee_type: string
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_method: string | null
          student_id: string
          transaction_id: string | null
          transaction_status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          college_id: string
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          fee_type: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          student_id: string
          transaction_id?: string | null
          transaction_status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          college_id?: string
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          fee_type?: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          student_id?: string
          transaction_id?: string | null
          transaction_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          forum_id: string
          id: string
          parent_post_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          forum_id: string
          id?: string
          parent_post_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          forum_id?: string
          id?: string
          parent_post_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "discussion_forums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_submissions: {
        Row: {
          assignment_id: string
          course_id: string
          created_at: string | null
          feedback: string | null
          grade_letter: string | null
          grade_value: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          is_final: boolean | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          assignment_id: string
          course_id: string
          created_at?: string | null
          feedback?: string | null
          grade_letter?: string | null
          grade_value?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_final?: boolean | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string
          course_id?: string
          created_at?: string | null
          feedback?: string | null
          grade_letter?: string | null
          grade_value?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_final?: boolean | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      grades: {
        Row: {
          assignment_id: string | null
          course_id: string
          grade_letter: string | null
          grade_type: string
          id: string
          marks_obtained: number
          max_marks: number
          recorded_at: string | null
          recorded_by: string
          student_id: string
        }
        Insert: {
          assignment_id?: string | null
          course_id: string
          grade_letter?: string | null
          grade_type: string
          id?: string
          marks_obtained: number
          max_marks: number
          recorded_at?: string | null
          recorded_by: string
          student_id: string
        }
        Update: {
          assignment_id?: string | null
          course_id?: string
          grade_letter?: string | null
          grade_type?: string
          id?: string
          marks_obtained?: number
          max_marks?: number
          recorded_at?: string | null
          recorded_by?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hall_tickets: {
        Row: {
          exam_id: string
          generated_at: string | null
          generated_by: string
          hall_ticket_number: string
          id: string
          is_valid: boolean | null
          room_id: string | null
          seat_number: string | null
          special_instructions: string | null
          student_id: string
        }
        Insert: {
          exam_id: string
          generated_at?: string | null
          generated_by: string
          hall_ticket_number: string
          id?: string
          is_valid?: boolean | null
          room_id?: string | null
          seat_number?: string | null
          special_instructions?: string | null
          student_id: string
        }
        Update: {
          exam_id?: string
          generated_at?: string | null
          generated_by?: string
          hall_ticket_number?: string
          id?: string
          is_valid?: boolean | null
          room_id?: string | null
          seat_number?: string | null
          special_instructions?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hall_tickets_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "examinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hall_tickets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_applications: {
        Row: {
          allocated_at: string | null
          application_date: string | null
          comments: string | null
          id: string
          preferred_room_type: string | null
          processed_by: string | null
          room_id: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          allocated_at?: string | null
          application_date?: string | null
          comments?: string | null
          id?: string
          preferred_room_type?: string | null
          processed_by?: string | null
          room_id?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          allocated_at?: string | null
          application_date?: string | null
          comments?: string | null
          id?: string
          preferred_room_type?: string | null
          processed_by?: string | null
          room_id?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hostel_applications_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_applications_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hostel_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_rooms: {
        Row: {
          amenities: Json | null
          block_name: string
          capacity: number | null
          college_id: string
          created_at: string | null
          current_occupancy: number | null
          id: string
          is_available: boolean | null
          monthly_fee: number | null
          room_number: string
          room_type: string | null
        }
        Insert: {
          amenities?: Json | null
          block_name: string
          capacity?: number | null
          college_id: string
          created_at?: string | null
          current_occupancy?: number | null
          id?: string
          is_available?: boolean | null
          monthly_fee?: number | null
          room_number: string
          room_type?: string | null
        }
        Update: {
          amenities?: Json | null
          block_name?: string
          capacity?: number | null
          college_id?: string
          created_at?: string | null
          current_occupancy?: number | null
          id?: string
          is_available?: boolean | null
          monthly_fee?: number | null
          room_number?: string
          room_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hostel_rooms_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_modules: {
        Row: {
          content_url: string | null
          course_id: string
          created_at: string | null
          created_by: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_published: boolean | null
          module_name: string
          module_type: string | null
          prerequisites: Json | null
          sequence_order: number
        }
        Insert: {
          content_url?: string | null
          course_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          module_name: string
          module_type?: string | null
          prerequisites?: Json | null
          sequence_order: number
        }
        Update: {
          content_url?: string | null
          course_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          module_name?: string
          module_type?: string | null
          prerequisites?: Json | null
          sequence_order?: number
        }
        Relationships: []
      }
      lecture_materials: {
        Row: {
          course_id: string
          description: string | null
          file_url: string
          id: string
          material_type: string | null
          title: string
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          course_id: string
          description?: string | null
          file_url: string
          id?: string
          material_type?: string | null
          title: string
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          course_id?: string
          description?: string | null
          file_url?: string
          id?: string
          material_type?: string | null
          title?: string
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_materials_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_items: {
        Row: {
          category: string
          college_id: string
          condition: string
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          price: number
          seller_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          college_id: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          price: number
          seller_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          college_id?: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          price?: number
          seller_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_college"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_seller"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_transactions: {
        Row: {
          amount: number
          buyer_id: string
          college_id: string
          completed_at: string | null
          created_at: string
          id: string
          item_id: string
          seller_id: string
          status: string
        }
        Insert: {
          amount: number
          buyer_id: string
          college_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          item_id: string
          seller_id: string
          status?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          college_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          item_id?: string
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_buyer"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_college"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_item"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_seller"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel_id: string
          created_at: string | null
          file_url: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          message_text: string
          message_type: string | null
          reply_to_id: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          message_text: string
          message_type?: string | null
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          message_text?: string
          message_type?: string | null
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "communication_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          college_id: string
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          notification_type: string
          priority: string | null
          recipient_id: string
          sender_id: string | null
          title: string
        }
        Insert: {
          action_url?: string | null
          college_id: string
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          notification_type?: string
          priority?: string | null
          recipient_id: string
          sender_id?: string | null
          title: string
        }
        Update: {
          action_url?: string | null
          college_id?: string
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          notification_type?: string
          priority?: string | null
          recipient_id?: string
          sender_id?: string | null
          title?: string
        }
        Relationships: []
      }
      parent_feedback: {
        Row: {
          content: string
          course_id: string | null
          created_at: string | null
          feedback_type: string
          id: string
          parent_id: string
          responded_at: string | null
          responded_by: string | null
          response: string | null
          status: string | null
          student_id: string
          title: string
        }
        Insert: {
          content: string
          course_id?: string | null
          created_at?: string | null
          feedback_type: string
          id?: string
          parent_id: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string | null
          student_id: string
          title: string
        }
        Update: {
          content?: string
          course_id?: string | null
          created_at?: string | null
          feedback_type?: string
          id?: string
          parent_id?: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string | null
          student_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_feedback_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_feedback_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_feedback_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_feedback_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_meetings: {
        Row: {
          agenda: string | null
          created_at: string | null
          id: string
          meeting_date: string
          meeting_type: string | null
          notes: string | null
          parent_id: string | null
          status: string | null
          student_id: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          agenda?: string | null
          created_at?: string | null
          id?: string
          meeting_date: string
          meeting_type?: string | null
          notes?: string | null
          parent_id?: string | null
          status?: string | null
          student_id: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          agenda?: string | null
          created_at?: string | null
          id?: string
          meeting_date?: string
          meeting_type?: string | null
          notes?: string | null
          parent_id?: string | null
          status?: string | null
          student_id?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_meetings_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_meetings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_meetings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_notifications: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          parent_id: string
          student_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          parent_id: string
          student_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          parent_id?: string
          student_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_notifications_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_links: {
        Row: {
          created_at: string | null
          id: string
          is_primary_contact: boolean | null
          parent_id: string
          relationship_type: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary_contact?: boolean | null
          parent_id: string
          relationship_type: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary_contact?: boolean | null
          parent_id?: string
          relationship_type?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proctoring_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: Database["public"]["Enums"]["proctoring_event_type"]
          assigned_to: string | null
          created_at: string | null
          escalated_at: string | null
          escalated_to: string | null
          escalation_reason: string | null
          event_id: string | null
          id: string
          is_escalated: boolean | null
          message: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolution_notes: string | null
          session_id: string
          severity: Database["public"]["Enums"]["violation_severity"]
          status: Database["public"]["Enums"]["alert_status"] | null
          title: string
          updated_at: string | null
          violation_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: Database["public"]["Enums"]["proctoring_event_type"]
          assigned_to?: string | null
          created_at?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          event_id?: string | null
          id?: string
          is_escalated?: boolean | null
          message?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
          session_id: string
          severity: Database["public"]["Enums"]["violation_severity"]
          status?: Database["public"]["Enums"]["alert_status"] | null
          title: string
          updated_at?: string | null
          violation_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: Database["public"]["Enums"]["proctoring_event_type"]
          assigned_to?: string | null
          created_at?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          event_id?: string | null
          id?: string
          is_escalated?: boolean | null
          message?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
          session_id?: string
          severity?: Database["public"]["Enums"]["violation_severity"]
          status?: Database["public"]["Enums"]["alert_status"] | null
          title?: string
          updated_at?: string | null
          violation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proctoring_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_alerts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_alerts_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "proctoring_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_alerts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "proctoring_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_alerts_violation_id_fkey"
            columns: ["violation_id"]
            isOneToOne: false
            referencedRelation: "proctoring_violations"
            referencedColumns: ["id"]
          },
        ]
      }
      proctoring_events: {
        Row: {
          ai_confidence: number | null
          ai_model_version: string | null
          audio_clip_url: string | null
          created_at: string | null
          description: string | null
          details: Json | null
          event_type: Database["public"]["Enums"]["proctoring_event_type"]
          flag_reason: string | null
          flagged_at: string | null
          flagged_by: string | null
          id: string
          is_flagged: boolean | null
          session_id: string
          severity: Database["public"]["Enums"]["violation_severity"] | null
          snapshot_url: string | null
          timestamp: string | null
          video_clip_url: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_model_version?: string | null
          audio_clip_url?: string | null
          created_at?: string | null
          description?: string | null
          details?: Json | null
          event_type: Database["public"]["Enums"]["proctoring_event_type"]
          flag_reason?: string | null
          flagged_at?: string | null
          flagged_by?: string | null
          id?: string
          is_flagged?: boolean | null
          session_id: string
          severity?: Database["public"]["Enums"]["violation_severity"] | null
          snapshot_url?: string | null
          timestamp?: string | null
          video_clip_url?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_model_version?: string | null
          audio_clip_url?: string | null
          created_at?: string | null
          description?: string | null
          details?: Json | null
          event_type?: Database["public"]["Enums"]["proctoring_event_type"]
          flag_reason?: string | null
          flagged_at?: string | null
          flagged_by?: string | null
          id?: string
          is_flagged?: boolean | null
          session_id?: string
          severity?: Database["public"]["Enums"]["violation_severity"] | null
          snapshot_url?: string | null
          timestamp?: string | null
          video_clip_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proctoring_events_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "proctoring_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      proctoring_interventions: {
        Row: {
          alert_id: string | null
          created_at: string | null
          id: string
          intervened_at: string | null
          intervened_by: string
          intervention_type: string
          message: string | null
          session_id: string
          student_acknowledged: boolean | null
          student_acknowledged_at: string | null
          student_response: string | null
        }
        Insert: {
          alert_id?: string | null
          created_at?: string | null
          id?: string
          intervened_at?: string | null
          intervened_by: string
          intervention_type: string
          message?: string | null
          session_id: string
          student_acknowledged?: boolean | null
          student_acknowledged_at?: string | null
          student_response?: string | null
        }
        Update: {
          alert_id?: string | null
          created_at?: string | null
          id?: string
          intervened_at?: string | null
          intervened_by?: string
          intervention_type?: string
          message?: string | null
          session_id?: string
          student_acknowledged?: boolean | null
          student_acknowledged_at?: string | null
          student_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proctoring_interventions_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "proctoring_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_interventions_intervened_by_fkey"
            columns: ["intervened_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_interventions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "proctoring_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      proctoring_sessions: {
        Row: {
          college_id: string
          consent_given: boolean | null
          consent_timestamp: string | null
          created_at: string | null
          critical_violations: number | null
          device_info: Json | null
          duration_seconds: number | null
          ended_at: string | null
          exam_enrollment_id: string | null
          exam_id: string | null
          final_verdict: string | null
          high_severity_violations: number | null
          id: string
          identity_verified: boolean | null
          ip_address: unknown | null
          low_severity_violations: number | null
          medium_severity_violations: number | null
          quiz_id: string | null
          quiz_submission_id: string | null
          review_notes: string | null
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          screen_recording_url: string | null
          settings_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["proctoring_session_status"] | null
          student_id: string
          total_events: number | null
          total_violations: number | null
          updated_at: string | null
          verification_method: string | null
          video_recording_url: string | null
        }
        Insert: {
          college_id: string
          consent_given?: boolean | null
          consent_timestamp?: string | null
          created_at?: string | null
          critical_violations?: number | null
          device_info?: Json | null
          duration_seconds?: number | null
          ended_at?: string | null
          exam_enrollment_id?: string | null
          exam_id?: string | null
          final_verdict?: string | null
          high_severity_violations?: number | null
          id?: string
          identity_verified?: boolean | null
          ip_address?: unknown | null
          low_severity_violations?: number | null
          medium_severity_violations?: number | null
          quiz_id?: string | null
          quiz_submission_id?: string | null
          review_notes?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screen_recording_url?: string | null
          settings_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["proctoring_session_status"] | null
          student_id: string
          total_events?: number | null
          total_violations?: number | null
          updated_at?: string | null
          verification_method?: string | null
          video_recording_url?: string | null
        }
        Update: {
          college_id?: string
          consent_given?: boolean | null
          consent_timestamp?: string | null
          created_at?: string | null
          critical_violations?: number | null
          device_info?: Json | null
          duration_seconds?: number | null
          ended_at?: string | null
          exam_enrollment_id?: string | null
          exam_id?: string | null
          final_verdict?: string | null
          high_severity_violations?: number | null
          id?: string
          identity_verified?: boolean | null
          ip_address?: unknown | null
          low_severity_violations?: number | null
          medium_severity_violations?: number | null
          quiz_id?: string | null
          quiz_submission_id?: string | null
          review_notes?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screen_recording_url?: string | null
          settings_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["proctoring_session_status"] | null
          student_id?: string
          total_events?: number | null
          total_violations?: number | null
          updated_at?: string | null
          verification_method?: string | null
          video_recording_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proctoring_sessions_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_sessions_exam_enrollment_id_fkey"
            columns: ["exam_enrollment_id"]
            isOneToOne: false
            referencedRelation: "exam_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_sessions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "examinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_sessions_quiz_submission_id_fkey"
            columns: ["quiz_submission_id"]
            isOneToOne: false
            referencedRelation: "quiz_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_sessions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_sessions_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: false
            referencedRelation: "proctoring_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proctoring_settings: {
        Row: {
          ai_audio_analysis_enabled: boolean | null
          ai_behavior_analysis_enabled: boolean | null
          ai_face_detection_enabled: boolean | null
          ai_gaze_tracking_enabled: boolean | null
          ai_object_detection_enabled: boolean | null
          allow_tab_switching: boolean | null
          allowed_applications: Json | null
          audio_analysis_interval_seconds: number | null
          auto_pause_on_critical_violation: boolean | null
          blocked_applications: Json | null
          created_at: string | null
          created_by: string | null
          custom_rules: Json | null
          exam_id: string | null
          face_detection_interval_seconds: number | null
          id: string
          is_enabled: boolean | null
          max_looking_away_duration_seconds: number | null
          max_no_face_duration_seconds: number | null
          min_confidence_threshold: number | null
          notify_proctor_immediately: boolean | null
          quiz_id: string | null
          record_full_session: boolean | null
          record_violations_only: boolean | null
          require_fullscreen: boolean | null
          require_microphone: boolean | null
          require_screen_share: boolean | null
          require_webcam: boolean | null
          snapshot_interval_seconds: number | null
          updated_at: string | null
          video_quality: string | null
        }
        Insert: {
          ai_audio_analysis_enabled?: boolean | null
          ai_behavior_analysis_enabled?: boolean | null
          ai_face_detection_enabled?: boolean | null
          ai_gaze_tracking_enabled?: boolean | null
          ai_object_detection_enabled?: boolean | null
          allow_tab_switching?: boolean | null
          allowed_applications?: Json | null
          audio_analysis_interval_seconds?: number | null
          auto_pause_on_critical_violation?: boolean | null
          blocked_applications?: Json | null
          created_at?: string | null
          created_by?: string | null
          custom_rules?: Json | null
          exam_id?: string | null
          face_detection_interval_seconds?: number | null
          id?: string
          is_enabled?: boolean | null
          max_looking_away_duration_seconds?: number | null
          max_no_face_duration_seconds?: number | null
          min_confidence_threshold?: number | null
          notify_proctor_immediately?: boolean | null
          quiz_id?: string | null
          record_full_session?: boolean | null
          record_violations_only?: boolean | null
          require_fullscreen?: boolean | null
          require_microphone?: boolean | null
          require_screen_share?: boolean | null
          require_webcam?: boolean | null
          snapshot_interval_seconds?: number | null
          updated_at?: string | null
          video_quality?: string | null
        }
        Update: {
          ai_audio_analysis_enabled?: boolean | null
          ai_behavior_analysis_enabled?: boolean | null
          ai_face_detection_enabled?: boolean | null
          ai_gaze_tracking_enabled?: boolean | null
          ai_object_detection_enabled?: boolean | null
          allow_tab_switching?: boolean | null
          allowed_applications?: Json | null
          audio_analysis_interval_seconds?: number | null
          auto_pause_on_critical_violation?: boolean | null
          blocked_applications?: Json | null
          created_at?: string | null
          created_by?: string | null
          custom_rules?: Json | null
          exam_id?: string | null
          face_detection_interval_seconds?: number | null
          id?: string
          is_enabled?: boolean | null
          max_looking_away_duration_seconds?: number | null
          max_no_face_duration_seconds?: number | null
          min_confidence_threshold?: number | null
          notify_proctor_immediately?: boolean | null
          quiz_id?: string | null
          record_full_session?: boolean | null
          record_violations_only?: boolean | null
          require_fullscreen?: boolean | null
          require_microphone?: boolean | null
          require_screen_share?: boolean | null
          require_webcam?: boolean | null
          snapshot_interval_seconds?: number | null
          updated_at?: string | null
          video_quality?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proctoring_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_settings_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "examinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_settings_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      proctoring_violations: {
        Row: {
          action_taken: string | null
          created_at: string | null
          description: string | null
          event_id: string | null
          evidence_urls: Json | null
          exam_invalidated: boolean | null
          id: string
          is_false_positive: boolean | null
          marks_deducted: number | null
          review_notes: string | null
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string
          severity: Database["public"]["Enums"]["violation_severity"]
          timestamp: string | null
          title: string
          updated_at: string | null
          violation_type: Database["public"]["Enums"]["violation_type"]
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          evidence_urls?: Json | null
          exam_invalidated?: boolean | null
          id?: string
          is_false_positive?: boolean | null
          marks_deducted?: number | null
          review_notes?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id: string
          severity: Database["public"]["Enums"]["violation_severity"]
          timestamp?: string | null
          title: string
          updated_at?: string | null
          violation_type: Database["public"]["Enums"]["violation_type"]
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          evidence_urls?: Json | null
          exam_invalidated?: boolean | null
          id?: string
          is_false_positive?: boolean | null
          marks_deducted?: number | null
          review_notes?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string
          severity?: Database["public"]["Enums"]["violation_severity"]
          timestamp?: string | null
          title?: string
          updated_at?: string | null
          violation_type?: Database["public"]["Enums"]["violation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "proctoring_violations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "proctoring_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_violations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proctoring_violations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "proctoring_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string | null
          created_at: string | null
          id: string
          marks: number | null
          options: Json | null
          order_index: number
          question_text: string
          question_type: string
          quiz_id: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string | null
          id?: string
          marks?: number | null
          options?: Json | null
          order_index: number
          question_text: string
          question_type: string
          quiz_id: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string | null
          id?: string
          marks?: number | null
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_submissions: {
        Row: {
          answers: Json | null
          attempt_number: number
          id: string
          is_completed: boolean | null
          quiz_id: string
          score: number | null
          started_at: string | null
          student_id: string
          submitted_at: string | null
          time_taken_minutes: number | null
        }
        Insert: {
          answers?: Json | null
          attempt_number: number
          id?: string
          is_completed?: boolean | null
          quiz_id: string
          score?: number | null
          started_at?: string | null
          student_id: string
          submitted_at?: string | null
          time_taken_minutes?: number | null
        }
        Update: {
          answers?: Json | null
          attempt_number?: number
          id?: string
          is_completed?: boolean | null
          quiz_id?: string
          score?: number | null
          started_at?: string | null
          student_id?: string
          submitted_at?: string | null
          time_taken_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          attempts_allowed: number | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          module_id: string
          pass_percentage: number | null
          quiz_name: string
          time_limit_minutes: number | null
        }
        Insert: {
          attempts_allowed?: number | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          module_id: string
          pass_percentage?: number | null
          quiz_name: string
          time_limit_minutes?: number | null
        }
        Update: {
          attempts_allowed?: number | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string
          pass_percentage?: number | null
          quiz_name?: string
          time_limit_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          action: Database["public"]["Enums"]["permission_action"]
          created_at: string | null
          id: string
          is_allowed: boolean | null
          resource_type: Database["public"]["Enums"]["resource_type"]
          role_type: Database["public"]["Enums"]["admin_role_type"]
        }
        Insert: {
          action: Database["public"]["Enums"]["permission_action"]
          created_at?: string | null
          id?: string
          is_allowed?: boolean | null
          resource_type: Database["public"]["Enums"]["resource_type"]
          role_type: Database["public"]["Enums"]["admin_role_type"]
        }
        Update: {
          action?: Database["public"]["Enums"]["permission_action"]
          created_at?: string | null
          id?: string
          is_allowed?: boolean | null
          resource_type?: Database["public"]["Enums"]["resource_type"]
          role_type?: Database["public"]["Enums"]["admin_role_type"]
        }
        Relationships: []
      }
      rooms: {
        Row: {
          amenities: Json | null
          building: string | null
          capacity: number | null
          college_id: string
          created_at: string | null
          floor: number | null
          id: string
          is_available: boolean | null
          room_number: string
          room_type: string | null
        }
        Insert: {
          amenities?: Json | null
          building?: string | null
          capacity?: number | null
          college_id: string
          created_at?: string | null
          floor?: number | null
          id?: string
          is_available?: boolean | null
          room_number: string
          room_type?: string | null
        }
        Update: {
          amenities?: Json | null
          building?: string | null
          capacity?: number | null
          college_id?: string
          created_at?: string | null
          floor?: number | null
          id?: string
          is_available?: boolean | null
          room_number?: string
          room_type?: string | null
        }
        Relationships: []
      }
      security_settings: {
        Row: {
          backup_codes: string[] | null
          college_id: string
          created_at: string | null
          id: string
          last_login_at: string | null
          locked_until: string | null
          login_attempts: number | null
          password_expires_at: string | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          college_id: string
          created_at?: string | null
          id?: string
          last_login_at?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          password_expires_at?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          college_id?: string
          created_at?: string | null
          id?: string
          last_login_at?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          password_expires_at?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_settings_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_academic_records: {
        Row: {
          academic_status: string | null
          academic_year: string
          cgpa: number | null
          college_id: string
          completed_credits: number | null
          created_at: string | null
          id: string
          semester: string
          sgpa: number | null
          student_id: string
          total_credits: number | null
          updated_at: string | null
        }
        Insert: {
          academic_status?: string | null
          academic_year: string
          cgpa?: number | null
          college_id: string
          completed_credits?: number | null
          created_at?: string | null
          id?: string
          semester: string
          sgpa?: number | null
          student_id: string
          total_credits?: number | null
          updated_at?: string | null
        }
        Update: {
          academic_status?: string | null
          academic_year?: string
          cgpa?: number | null
          college_id?: string
          completed_credits?: number | null
          created_at?: string | null
          id?: string
          semester?: string
          sgpa?: number | null
          student_id?: string
          total_credits?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          completion_percentage: number | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          last_accessed_at: string | null
          module_id: string
          student_id: string
          time_spent_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_accessed_at?: string | null
          module_id: string
          student_id: string
          time_spent_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_accessed_at?: string | null
          module_id?: string
          student_id?: string
          time_spent_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progress_reports: {
        Row: {
          areas_for_improvement: string | null
          attendance_percentage: number | null
          behavioral_notes: string | null
          course_id: string
          generated_at: string | null
          grade_summary: Json | null
          id: string
          report_period: string
          shared_with_parents: boolean | null
          strengths: string | null
          student_id: string
          teacher_id: string
        }
        Insert: {
          areas_for_improvement?: string | null
          attendance_percentage?: number | null
          behavioral_notes?: string | null
          course_id: string
          generated_at?: string | null
          grade_summary?: Json | null
          id?: string
          report_period: string
          shared_with_parents?: boolean | null
          strengths?: string | null
          student_id: string
          teacher_id: string
        }
        Update: {
          areas_for_improvement?: string | null
          attendance_percentage?: number | null
          behavioral_notes?: string | null
          course_id?: string
          generated_at?: string | null
          grade_summary?: Json | null
          id?: string
          report_period?: string
          shared_with_parents?: boolean | null
          strengths?: string | null
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_reports_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          college_id: string
          created_at: string | null
          description: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          student_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          college_id: string
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          student_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          college_id?: string
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          student_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          college_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          setting_category: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          college_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          setting_category: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          college_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          setting_category?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_messages: {
        Row: {
          content: string
          course_id: string | null
          id: string
          is_read: boolean | null
          message_type: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string
          sent_at: string | null
          subject: string
        }
        Insert: {
          content: string
          course_id?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
          sent_at?: string | null
          subject: string
        }
        Update: {
          content?: string
          course_id?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          sent_at?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_messages_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      temporary_passwords: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string
          id: string
          is_used: boolean | null
          temp_password: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          id?: string
          is_used?: boolean | null
          temp_password: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean | null
          temp_password?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "temporary_passwords_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporary_passwords_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_slots: {
        Row: {
          academic_year: string
          course_id: string
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          instructor_id: string
          is_active: boolean | null
          room_id: string | null
          semester: string
          slot_type: string | null
          start_time: string
        }
        Insert: {
          academic_year: string
          course_id: string
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          instructor_id: string
          is_active?: boolean | null
          room_id?: string | null
          semester: string
          slot_type?: string | null
          start_time: string
        }
        Update: {
          academic_year?: string
          course_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          instructor_id?: string
          is_active?: boolean | null
          room_id?: string | null
          semester?: string
          slot_type?: string | null
          start_time?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          college_id: string
          created_at: string | null
          first_login_completed: boolean | null
          id: string
          onboarding_completed: boolean | null
          password_reset_required: boolean | null
          temp_password: string
          updated_at: string | null
          user_id: string
          welcome_email_delivered: boolean | null
          welcome_email_failed: boolean | null
          welcome_email_opened: boolean | null
          welcome_email_sent: boolean | null
        }
        Insert: {
          college_id: string
          created_at?: string | null
          first_login_completed?: boolean | null
          id?: string
          onboarding_completed?: boolean | null
          password_reset_required?: boolean | null
          temp_password: string
          updated_at?: string | null
          user_id: string
          welcome_email_delivered?: boolean | null
          welcome_email_failed?: boolean | null
          welcome_email_opened?: boolean | null
          welcome_email_sent?: boolean | null
        }
        Update: {
          college_id?: string
          created_at?: string | null
          first_login_completed?: boolean | null
          id?: string
          onboarding_completed?: boolean | null
          password_reset_required?: boolean | null
          temp_password?: string
          updated_at?: string | null
          user_id?: string
          welcome_email_delivered?: boolean | null
          welcome_email_failed?: boolean | null
          welcome_email_opened?: boolean | null
          welcome_email_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_onboarding_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_onboarding_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          address: string | null
          college_id: string
          created_at: string | null
          date_of_birth: string | null
          email: string
          emergency_contact: Json | null
          first_name: string
          hierarchy_level:
            | Database["public"]["Enums"]["user_hierarchy_level"]
            | null
          id: string
          is_active: boolean | null
          last_name: string
          phone_number: string | null
          profile_picture_url: string | null
          updated_at: string | null
          user_code: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          address?: string | null
          college_id: string
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          emergency_contact?: Json | null
          first_name: string
          hierarchy_level?:
            | Database["public"]["Enums"]["user_hierarchy_level"]
            | null
          id: string
          is_active?: boolean | null
          last_name: string
          phone_number?: string | null
          profile_picture_url?: string | null
          updated_at?: string | null
          user_code: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          address?: string | null
          college_id?: string
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          emergency_contact?: Json | null
          first_name?: string
          hierarchy_level?:
            | Database["public"]["Enums"]["user_hierarchy_level"]
            | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          phone_number?: string | null
          profile_picture_url?: string | null
          updated_at?: string | null
          user_code?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_applications: {
        Row: {
          applied_at: string | null
          availability: string | null
          id: string
          motivation: string | null
          opportunity_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          volunteer_id: string
        }
        Insert: {
          applied_at?: string | null
          availability?: string | null
          id?: string
          motivation?: string | null
          opportunity_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          volunteer_id: string
        }
        Update: {
          applied_at?: string | null
          availability?: string | null
          id?: string
          motivation?: string | null
          opportunity_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "volunteer_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_applications_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_opportunities: {
        Row: {
          college_id: string
          created_at: string | null
          created_by: string
          current_volunteers: number | null
          description: string
          end_date: string | null
          id: string
          is_active: boolean | null
          location: string | null
          max_volunteers: number | null
          requirements: string | null
          start_date: string | null
          time_commitment: string | null
          title: string
        }
        Insert: {
          college_id: string
          created_at?: string | null
          created_by: string
          current_volunteers?: number | null
          description: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          max_volunteers?: number | null
          requirements?: string | null
          start_date?: string | null
          time_commitment?: string | null
          title: string
        }
        Update: {
          college_id?: string
          created_at?: string | null
          created_by?: string
          current_volunteers?: number | null
          description?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          max_volunteers?: number | null
          requirements?: string | null
          start_date?: string | null
          time_commitment?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_opportunities_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_temp_password: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_user_code: {
        Args: { college_code: string; user_type_param: string }
        Returns: string
      }
      get_alumni_stats: {
        Args: { college_uuid: string }
        Returns: {
          total_alumni: number
          active_contributors: number
          total_donations: number
          upcoming_events: number
        }[]
      }
      get_college_by_code: {
        Args: { college_code: string }
        Returns: {
          id: string
          code: string
          name: string
          logo: string
          primary_color: string
          secondary_color: string
        }[]
      }
      get_parent_children: {
        Args: { parent_uuid: string }
        Returns: {
          student_id: string
          student_name: string
          user_code: string
          relationship_type: string
        }[]
      }
      get_student_academic_summary: {
        Args: { student_uuid: string; parent_uuid: string }
        Returns: {
          course_name: string
          instructor_name: string
          current_grade: string
          attendance_percentage: number
          total_assignments: number
          submitted_assignments: number
        }[]
      }
      get_user_admin_roles: {
        Args: { user_uuid: string; college_uuid: string }
        Returns: {
          role_type: Database["public"]["Enums"]["admin_role_type"]
          permissions: Json
          assigned_at: string
        }[]
      }
      get_user_email: {
        Args: { college_code: string; user_code: string }
        Returns: {
          user_exists: boolean
          email: string
        }[]
      }
      get_user_permissions: {
        Args: { user_uuid: string }
        Returns: {
          user_type: string
          college_id: string
          permissions: Json
        }[]
      }
      has_admin_permission: {
        Args: {
          user_uuid: string
          college_uuid: string
          required_role: Database["public"]["Enums"]["admin_role_type"]
        }
        Returns: boolean
      }
      has_permission: {
        Args: { user_uuid: string; permission_name: string }
        Returns: boolean
      }
      has_resource_permission: {
        Args: {
          user_uuid: string
          college_uuid: string
          resource: Database["public"]["Enums"]["resource_type"]
          action: Database["public"]["Enums"]["permission_action"]
        }
        Returns: boolean
      }
      is_super_admin: {
        Args: { user_uuid: string; college_uuid: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          college_uuid: string
          admin_uuid: string
          target_uuid: string
          action_type_param: string
          action_desc: string
          module_param: string
          old_vals?: Json
          new_vals?: Json
        }
        Returns: string
      }
      validate_college_user: {
        Args: { college_code: string; user_code: string }
        Returns: {
          college_id: string
          college_name: string
          college_logo: string
          primary_color: string
          secondary_color: string
          user_exists: boolean
        }[]
      }
      validate_user_login: {
        Args: {
          p_college_code: string
          p_user_code: string
          p_user_password: string
        }
        Returns: {
          login_success: boolean
          user_id: string
          user_type: string
          first_name: string
          last_name: string
          email: string
          error_message: string
        }[]
      }
    }
    Enums: {
      admin_role_type:
        | "super_admin"
        | "user_admin"
        | "facility_admin"
        | "event_admin"
        | "finance_admin"
        | "it_admin"
      alert_status:
        | "pending"
        | "acknowledged"
        | "reviewing"
        | "resolved"
        | "escalated"
      permission_action:
        | "create"
        | "read"
        | "update"
        | "delete"
        | "bulk_upload"
        | "export"
        | "assign"
        | "approve"
      proctoring_event_type:
        | "multiple_faces"
        | "no_face"
        | "face_not_matching"
        | "looking_away"
        | "object_detected"
        | "audio_conversation"
        | "audio_unusual"
        | "tab_switch"
        | "window_switch"
        | "screen_share_detected"
        | "fullscreen_exit"
        | "browser_focus_lost"
        | "copy_paste"
        | "network_disconnection"
        | "network_reconnection"
        | "system_info"
      proctoring_session_status:
        | "pending"
        | "active"
        | "paused"
        | "completed"
        | "terminated"
        | "failed"
      resource_type:
        | "students"
        | "faculty"
        | "staff"
        | "courses"
        | "fees"
        | "facilities"
        | "events"
        | "library"
        | "exams"
        | "audit_logs"
        | "system_settings"
      user_hierarchy_level:
        | "super_admin"
        | "admin"
        | "faculty"
        | "student"
        | "parent"
        | "alumni"
      user_type:
        | "student"
        | "faculty"
        | "admin"
        | "staff"
        | "parent"
        | "alumni"
        | "super_admin"
        | "teacher"
      user_type_enum:
        | "student"
        | "faculty"
        | "staff"
        | "admin"
        | "parent"
        | "alumni"
        | "super_admin"
      violation_severity:
        | "info"
        | "low"
        | "medium"
        | "high"
        | "critical"
      violation_type:
        | "identity_fraud"
        | "unauthorized_assistance"
        | "unauthorized_materials"
        | "technical_violation"
        | "behavioral_anomaly"
        | "environmental_issue"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_role_type: [
        "super_admin",
        "user_admin",
        "facility_admin",
        "event_admin",
        "finance_admin",
        "it_admin",
      ],
      alert_status: [
        "pending",
        "acknowledged",
        "reviewing",
        "resolved",
        "escalated",
      ],
      permission_action: [
        "create",
        "read",
        "update",
        "delete",
        "bulk_upload",
        "export",
        "assign",
        "approve",
      ],
      proctoring_event_type: [
        "multiple_faces",
        "no_face",
        "face_not_matching",
        "looking_away",
        "object_detected",
        "audio_conversation",
        "audio_unusual",
        "tab_switch",
        "window_switch",
        "screen_share_detected",
        "fullscreen_exit",
        "browser_focus_lost",
        "copy_paste",
        "network_disconnection",
        "network_reconnection",
        "system_info",
      ],
      proctoring_session_status: [
        "pending",
        "active",
        "paused",
        "completed",
        "terminated",
        "failed",
      ],
      resource_type: [
        "students",
        "faculty",
        "staff",
        "courses",
        "fees",
        "facilities",
        "events",
        "library",
        "exams",
        "audit_logs",
        "system_settings",
      ],
      user_hierarchy_level: [
        "super_admin",
        "admin",
        "faculty",
        "student",
        "parent",
        "alumni",
      ],
      user_type: [
        "student",
        "faculty",
        "admin",
        "staff",
        "parent",
        "alumni",
        "super_admin",
        "teacher",
      ],
      user_type_enum: [
        "student",
        "faculty",
        "staff",
        "admin",
        "parent",
        "alumni",
        "super_admin",
      ],
      violation_severity: [
        "info",
        "low",
        "medium",
        "high",
        "critical",
      ],
      violation_type: [
        "identity_fraud",
        "unauthorized_assistance",
        "unauthorized_materials",
        "technical_violation",
        "behavioral_anomaly",
        "environmental_issue",
      ],
    },
  },
} as const
