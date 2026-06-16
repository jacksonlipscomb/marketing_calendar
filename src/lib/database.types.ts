// Hand-written to mirror supabase/migrations/ exactly (0004_reset_campaigns.sql
// is the current schema). Kept in sync by hand rather than `supabase gen types`
// so the build has no dependency on a live DB connection.
//
// IMPORTANT: after any new migration, re-sync this file — either by hand or by
// regenerating: `npx supabase gen types typescript --linked > src/lib/database.types.ts`
// (then re-add the constant exports below).

export type Database = {
  public: {
    Tables: {
      campaigns: {
        Row: {
          id: string
          name: string
          goal: string | null
          category: Database["public"]["Enums"]["campaign_category"]
          start_date: string
          end_date: string
          segmentation: string | null
          owners: string[]
          status: Database["public"]["Enums"]["campaign_status"]
          reminders_enabled: boolean
          is_seed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          goal?: string | null
          category: Database["public"]["Enums"]["campaign_category"]
          start_date: string
          end_date: string
          segmentation?: string | null
          owners?: string[]
          status?: Database["public"]["Enums"]["campaign_status"]
          reminders_enabled?: boolean
          is_seed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          goal?: string | null
          category?: Database["public"]["Enums"]["campaign_category"]
          start_date?: string
          end_date?: string
          segmentation?: string | null
          owners?: string[]
          status?: Database["public"]["Enums"]["campaign_status"]
          reminders_enabled?: boolean
          is_seed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      deliverables: {
        Row: {
          id: string
          campaign_id: string
          title: string
          details: string | null
          start_date: string
          end_date: string
          owners: string[]
          status: Database["public"]["Enums"]["deliverable_status"]
          reminded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          title: string
          details?: string | null
          start_date: string
          end_date: string
          owners?: string[]
          status?: Database["public"]["Enums"]["deliverable_status"]
          reminded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          title?: string
          details?: string | null
          start_date?: string
          end_date?: string
          owners?: string[]
          status?: Database["public"]["Enums"]["deliverable_status"]
          reminded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_campaign_id_fkey"
            columns: ["campaign_id"]
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_jobs: {
        Row: {
          id: string
          deliverable_id: string
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
          deliverable_id: string
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
          deliverable_id?: string
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
            foreignKeyName: "email_jobs_deliverable_id_fkey"
            columns: ["deliverable_id"]
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: {
      // Atomic campaign shrink + child-deliverable clamp (migration 0005). Updates
      // the campaign and clamps overflowing deliverables in one transaction; raises
      // when a deliverable lies entirely outside the new window (un-clampable).
      update_campaign_clamp: {
        Args: {
          p_id: string
          p_name: string
          p_goal: string | null
          p_category: Database["public"]["Enums"]["campaign_category"]
          p_start: string
          p_end: string
          p_segmentation: string | null
          p_owners: string[]
          p_status: Database["public"]["Enums"]["campaign_status"]
          p_reminders_enabled: boolean
        }
        Returns: Database["public"]["Tables"]["campaigns"]["Row"]
      }
    }
    Enums: {
      campaign_category: "recruiting" | "retention" | "regatta" | "fundraising"
      campaign_status: "planned" | "in_progress" | "done"
      deliverable_status: "backlog" | "in_progress" | "complete"
      email_status: "draft" | "scheduled" | "sent" | "failed"
    }
    CompositeTypes: Record<never, never>
  }
}

export type CampaignCategory = Database["public"]["Enums"]["campaign_category"]
export type CampaignStatus = Database["public"]["Enums"]["campaign_status"]
export type DeliverableStatus = Database["public"]["Enums"]["deliverable_status"]
export type EmailStatus = Database["public"]["Enums"]["email_status"]

export type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"]
export type CampaignInsert = Database["public"]["Tables"]["campaigns"]["Insert"]
export type CampaignUpdate = Database["public"]["Tables"]["campaigns"]["Update"]
export type DeliverableRow = Database["public"]["Tables"]["deliverables"]["Row"]
export type DeliverableInsert =
  Database["public"]["Tables"]["deliverables"]["Insert"]
export type DeliverableUpdate =
  Database["public"]["Tables"]["deliverables"]["Update"]
export type EmailJobRow = Database["public"]["Tables"]["email_jobs"]["Row"]

export const CAMPAIGN_CATEGORIES = [
  "recruiting",
  "retention",
  "regatta",
  "fundraising",
] as const satisfies readonly CampaignCategory[]
export const CAMPAIGN_STATUSES = [
  "planned",
  "in_progress",
  "done",
] as const satisfies readonly CampaignStatus[]
export const DELIVERABLE_STATUSES = [
  "backlog",
  "in_progress",
  "complete",
] as const satisfies readonly DeliverableStatus[]
