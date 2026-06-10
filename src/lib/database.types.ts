// Hand-written to mirror supabase/migrations/0001_init.sql exactly.
// (Kept in sync by hand rather than `supabase gen types` so the build has no
// dependency on a live DB connection; the schema is small and fixed for the PoC.)
//
// IMPORTANT: after any new migration, re-sync this file — either by hand or by
// regenerating: `npx supabase gen types typescript --linked > src/lib/database.types.ts`
// (then re-add the EVENT_CATEGORIES/EVENT_STATUSES exports below).

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          category: Database["public"]["Enums"]["event_category"]
          event_date: string
          owner: string | null
          status: Database["public"]["Enums"]["event_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category: Database["public"]["Enums"]["event_category"]
          event_date: string
          owner?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category?: Database["public"]["Enums"]["event_category"]
          event_date?: string
          owner?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_jobs: {
        Row: {
          id: string
          event_id: string
          subject: string
          body: string
          recipient: string
          scheduled_for: string | null
          status: Database["public"]["Enums"]["email_status"]
          provider_message_id: string | null
          error: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          subject: string
          body: string
          recipient: string
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          provider_message_id?: string | null
          error?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          subject?: string
          body?: string
          recipient?: string
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          provider_message_id?: string | null
          error?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_jobs_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: {
      event_category: "recruiting" | "retention" | "regatta" | "fundraising"
      event_status: "planned" | "confirmed" | "done"
      email_status: "draft" | "scheduled" | "sent" | "failed"
    }
    CompositeTypes: Record<never, never>
  }
}

export type EventCategory = Database["public"]["Enums"]["event_category"]
export type EventStatus = Database["public"]["Enums"]["event_status"]
export type EmailStatus = Database["public"]["Enums"]["email_status"]

export type EventRow = Database["public"]["Tables"]["events"]["Row"]
export type EventInsert = Database["public"]["Tables"]["events"]["Insert"]
export type EventUpdate = Database["public"]["Tables"]["events"]["Update"]
export type EmailJobRow = Database["public"]["Tables"]["email_jobs"]["Row"]

export const EVENT_CATEGORIES = [
  "recruiting",
  "retention",
  "regatta",
  "fundraising",
] as const satisfies readonly EventCategory[]
export const EVENT_STATUSES = [
  "planned",
  "confirmed",
  "done",
] as const satisfies readonly EventStatus[]
