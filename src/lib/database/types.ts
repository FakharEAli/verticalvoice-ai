export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          industry: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          industry: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          industry?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tenant_members: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          role: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      business_profiles: {
        Row: {
          id: string;
          tenant_id: string;
          business_name: string;
          phone: string | null;
          email: string | null;
          website: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          country: string | null;
          timezone: string | null;
          logo_url: string | null;
          contact_name: string | null;
          preferred_language: string | null;
          secondary_language: string | null;
          number_of_locations: number | null;
          business_size: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          business_name: string;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          country?: string | null;
          timezone?: string | null;
          logo_url?: string | null;
          contact_name?: string | null;
          preferred_language?: string | null;
          secondary_language?: string | null;
          number_of_locations?: number | null;
          business_size?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          business_name?: string;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          country?: string | null;
          timezone?: string | null;
          logo_url?: string | null;
          contact_name?: string | null;
          preferred_language?: string | null;
          secondary_language?: string | null;
          number_of_locations?: number | null;
          business_size?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_profiles_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: true;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      policy_settings: {
        Row: {
          id: string;
          tenant_id: string;
          recording_enabled: boolean;
          recording_consent_required: boolean;
          hipaa_mode: boolean;
          max_call_duration_seconds: number;
          allow_outbound: boolean;
          require_caller_id: boolean;
          pii_redaction_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          recording_enabled?: boolean;
          recording_consent_required?: boolean;
          hipaa_mode?: boolean;
          max_call_duration_seconds?: number;
          allow_outbound?: boolean;
          require_caller_id?: boolean;
          pii_redaction_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          recording_enabled?: boolean;
          recording_consent_required?: boolean;
          hipaa_mode?: boolean;
          max_call_duration_seconds?: number;
          allow_outbound?: boolean;
          require_caller_id?: boolean;
          pii_redaction_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "policy_settings_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: true;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      voice_profiles: {
        Row: {
          id: string;
          tenant_id: string;
          provider: string;
          voice_id: string | null;
          speed: number;
          greeting: string | null;
          language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          provider?: string;
          voice_id?: string | null;
          speed?: number;
          greeting?: string | null;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          provider?: string;
          voice_id?: string | null;
          speed?: number;
          greeting?: string | null;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "voice_profiles_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: true;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          id: string;
          auth_id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      calls: {
        Row: {
          id: string;
          tenant_id: string;
          provider_call_id: string | null;
          direction: string;
          status: string;
          caller_number: string | null;
          called_number: string | null;
          duration_seconds: number | null;
          started_at: string;
          ended_at: string | null;
          recording_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          provider_call_id?: string | null;
          direction: string;
          status: string;
          caller_number?: string | null;
          called_number?: string | null;
          duration_seconds?: number | null;
          started_at?: string;
          ended_at?: string | null;
          recording_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          provider_call_id?: string | null;
          direction?: string;
          status?: string;
          caller_number?: string | null;
          called_number?: string | null;
          duration_seconds?: number | null;
          started_at?: string;
          ended_at?: string | null;
          recording_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calls_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      phone_numbers: {
        Row: {
          id: string;
          tenant_id: string;
          number: string;
          provider: string;
          provider_sid: string;
          capabilities: string[];
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          number: string;
          provider: string;
          provider_sid: string;
          capabilities?: string[];
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          number?: string;
          provider?: string;
          provider_sid?: string;
          capabilities?: string[];
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "phone_numbers_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_flags: {
        Row: {
          id: string;
          tenant_id: string;
          flag_name: string;
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          flag_name: string;
          enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          flag_name?: string;
          enabled?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feature_flags_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_events: {
        Row: {
          id: string;
          tenant_id: string;
          actor_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          actor_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          actor_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          role: string;
          token: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          email: string;
          role: string;
          token?: string;
          expires_at: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          email?: string;
          role?: string;
          token?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };

      // ─── Configuration Tables ───────────────────────────────────────

      locations: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          country: string | null;
          timezone: string;
          phone: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          country?: string | null;
          timezone?: string;
          phone?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          country?: string | null;
          timezone?: string;
          phone?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          permissions: Json;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          permissions?: Json;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          permissions?: Json;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      industry_packs: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          industry: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          industry: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          industry?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      industry_pack_versions: {
        Row: {
          id: string;
          pack_id: string;
          version: string;
          config: Json;
          changelog: string | null;
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pack_id: string;
          version: string;
          config: Json;
          changelog?: string | null;
          published_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pack_id?: string;
          version?: string;
          config?: Json;
          changelog?: string | null;
          published_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      agent_drafts: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          system_prompt: string | null;
          model: string;
          temperature: number;
          tools: Json | null;
          voice_profile_id: string | null;
          industry_pack_id: string | null;
          config: Json | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          system_prompt?: string | null;
          model?: string;
          temperature?: number;
          tools?: Json | null;
          voice_profile_id?: string | null;
          industry_pack_id?: string | null;
          config?: Json | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          system_prompt?: string | null;
          model?: string;
          temperature?: number;
          tools?: Json | null;
          voice_profile_id?: string | null;
          industry_pack_id?: string | null;
          config?: Json | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      agent_config_versions: {
        Row: {
          id: string;
          tenant_id: string;
          draft_id: string;
          version: number;
          snapshot: Json;
          published_by: string | null;
          published_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          draft_id: string;
          version: number;
          snapshot: Json;
          published_by?: string | null;
          published_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          draft_id?: string;
          version?: number;
          snapshot?: Json;
          published_by?: string | null;
          published_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      active_agent_configs: {
        Row: {
          id: string;
          tenant_id: string;
          agent_config_version_id: string;
          phone_number_id: string | null;
          location_id: string | null;
          activated_at: string;
          activated_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          agent_config_version_id: string;
          phone_number_id?: string | null;
          location_id?: string | null;
          activated_at?: string;
          activated_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          agent_config_version_id?: string;
          phone_number_id?: string | null;
          location_id?: string | null;
          activated_at?: string;
          activated_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      operating_hours: {
        Row: {
          id: string;
          tenant_id: string;
          location_id: string | null;
          day_of_week: number;
          open_time: string;
          close_time: string;
          is_closed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          location_id?: string | null;
          day_of_week: number;
          open_time: string;
          close_time: string;
          is_closed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          location_id?: string | null;
          day_of_week?: number;
          open_time?: string;
          close_time?: string;
          is_closed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      holiday_hours: {
        Row: {
          id: string;
          tenant_id: string;
          location_id: string | null;
          date: string;
          label: string;
          is_closed: boolean;
          open_time: string | null;
          close_time: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          location_id?: string | null;
          date: string;
          label: string;
          is_closed?: boolean;
          open_time?: string | null;
          close_time?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          location_id?: string | null;
          date?: string;
          label?: string;
          is_closed?: boolean;
          open_time?: string | null;
          close_time?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      escalation_rules: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          priority: number;
          conditions: Json;
          action: string;
          destination: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          priority?: number;
          conditions: Json;
          action: string;
          destination?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          priority?: number;
          conditions?: Json;
          action?: string;
          destination?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      retention_policies: {
        Row: {
          id: string;
          tenant_id: string;
          resource_type: string;
          retention_days: number;
          archive_before_delete: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          resource_type: string;
          retention_days: number;
          archive_before_delete?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          resource_type?: string;
          retention_days?: number;
          archive_before_delete?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ─── Knowledge Tables ──────────────────────────────────────────

      knowledge_sources: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          type: string;
          origin_url: string | null;
          status: string;
          last_synced_at: string | null;
          config: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          type: string;
          origin_url?: string | null;
          status?: string;
          last_synced_at?: string | null;
          config?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          type?: string;
          origin_url?: string | null;
          status?: string;
          last_synced_at?: string | null;
          config?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      knowledge_documents: {
        Row: {
          id: string;
          tenant_id: string;
          source_id: string;
          title: string;
          content_type: string;
          storage_path: string | null;
          file_size_bytes: number | null;
          checksum: string | null;
          status: string;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          source_id: string;
          title: string;
          content_type: string;
          storage_path?: string | null;
          file_size_bytes?: number | null;
          checksum?: string | null;
          status?: string;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          source_id?: string;
          title?: string;
          content_type?: string;
          storage_path?: string | null;
          file_size_bytes?: number | null;
          checksum?: string | null;
          status?: string;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      knowledge_chunks: {
        Row: {
          id: string;
          tenant_id: string;
          document_id: string;
          chunk_index: number;
          content: string;
          token_count: number;
          embedding: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          document_id: string;
          chunk_index: number;
          content: string;
          token_count?: number;
          embedding?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          document_id?: string;
          chunk_index?: number;
          content?: string;
          token_count?: number;
          embedding?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      knowledge_facts: {
        Row: {
          id: string;
          tenant_id: string;
          document_id: string | null;
          chunk_id: string | null;
          fact_text: string;
          category: string | null;
          confidence: number;
          is_verified: boolean;
          verified_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          document_id?: string | null;
          chunk_id?: string | null;
          fact_text: string;
          category?: string | null;
          confidence?: number;
          is_verified?: boolean;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          document_id?: string | null;
          chunk_id?: string | null;
          fact_text?: string;
          category?: string | null;
          confidence?: number;
          is_verified?: boolean;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      knowledge_conflicts: {
        Row: {
          id: string;
          tenant_id: string;
          fact_a_id: string;
          fact_b_id: string;
          conflict_type: string;
          resolution: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          fact_a_id: string;
          fact_b_id: string;
          conflict_type: string;
          resolution?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          fact_a_id?: string;
          fact_b_id?: string;
          conflict_type?: string;
          resolution?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      source_extractions: {
        Row: {
          id: string;
          tenant_id: string;
          source_id: string;
          status: string;
          started_at: string | null;
          completed_at: string | null;
          error_message: string | null;
          records_extracted: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          source_id: string;
          status?: string;
          started_at?: string | null;
          completed_at?: string | null;
          error_message?: string | null;
          records_extracted?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          source_id?: string;
          status?: string;
          started_at?: string | null;
          completed_at?: string | null;
          error_message?: string | null;
          records_extracted?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      source_extraction_fields: {
        Row: {
          id: string;
          extraction_id: string;
          field_name: string;
          field_value: string | null;
          confidence: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          extraction_id: string;
          field_name: string;
          field_value?: string | null;
          confidence?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          extraction_id?: string;
          field_name?: string;
          field_value?: string | null;
          confidence?: number;
          created_at?: string;
        };
        Relationships: [];
      };

      // ─── Integration Tables ────────────────────────────────────────

      integration_connections: {
        Row: {
          id: string;
          tenant_id: string;
          provider: string;
          status: string;
          credentials_encrypted: string | null;
          scopes: string[] | null;
          external_account_id: string | null;
          config: Json | null;
          connected_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          provider: string;
          status?: string;
          credentials_encrypted?: string | null;
          scopes?: string[] | null;
          external_account_id?: string | null;
          config?: Json | null;
          connected_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          provider?: string;
          status?: string;
          credentials_encrypted?: string | null;
          scopes?: string[] | null;
          external_account_id?: string | null;
          config?: Json | null;
          connected_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      integration_health: {
        Row: {
          id: string;
          connection_id: string;
          status: string;
          last_check_at: string;
          last_success_at: string | null;
          last_error: string | null;
          consecutive_failures: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          connection_id: string;
          status?: string;
          last_check_at?: string;
          last_success_at?: string | null;
          last_error?: string | null;
          consecutive_failures?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          connection_id?: string;
          status?: string;
          last_check_at?: string;
          last_success_at?: string | null;
          last_error?: string | null;
          consecutive_failures?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      webhook_endpoints: {
        Row: {
          id: string;
          tenant_id: string;
          url: string;
          secret: string;
          events: string[];
          is_active: boolean;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          url: string;
          secret?: string;
          events: string[];
          is_active?: boolean;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          url?: string;
          secret?: string;
          events?: string[];
          is_active?: boolean;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      webhook_deliveries: {
        Row: {
          id: string;
          endpoint_id: string;
          event_type: string;
          payload: Json;
          status: string;
          http_status: number | null;
          response_body: string | null;
          attempts: number;
          next_retry_at: string | null;
          delivered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          endpoint_id: string;
          event_type: string;
          payload: Json;
          status?: string;
          http_status?: number | null;
          response_body?: string | null;
          attempts?: number;
          next_retry_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          endpoint_id?: string;
          event_type?: string;
          payload?: Json;
          status?: string;
          http_status?: number | null;
          response_body?: string | null;
          attempts?: number;
          next_retry_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      dead_letter_events: {
        Row: {
          id: string;
          tenant_id: string;
          source: string;
          event_type: string;
          payload: Json;
          error_message: string | null;
          retry_count: number;
          max_retries: number;
          status: string;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          source: string;
          event_type: string;
          payload: Json;
          error_message?: string | null;
          retry_count?: number;
          max_retries?: number;
          status?: string;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          source?: string;
          event_type?: string;
          payload?: Json;
          error_message?: string | null;
          retry_count?: number;
          max_retries?: number;
          status?: string;
          created_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [];
      };

      // ─── Telephony / Voice Tables ──────────────────────────────────

      provider_agents: {
        Row: {
          id: string;
          tenant_id: string;
          provider: string;
          provider_agent_id: string;
          agent_config_version_id: string | null;
          phone_number_id: string | null;
          status: string;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          provider: string;
          provider_agent_id: string;
          agent_config_version_id?: string | null;
          phone_number_id?: string | null;
          status?: string;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          provider?: string;
          provider_agent_id?: string;
          agent_config_version_id?: string | null;
          phone_number_id?: string | null;
          status?: string;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      call_events: {
        Row: {
          id: string;
          call_id: string;
          event_type: string;
          timestamp: string;
          data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          event_type: string;
          timestamp?: string;
          data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          event_type?: string;
          timestamp?: string;
          data?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      call_participants: {
        Row: {
          id: string;
          call_id: string;
          role: string;
          phone_number: string | null;
          display_name: string | null;
          joined_at: string;
          left_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          role: string;
          phone_number?: string | null;
          display_name?: string | null;
          joined_at?: string;
          left_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          role?: string;
          phone_number?: string | null;
          display_name?: string | null;
          joined_at?: string;
          left_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      call_messages: {
        Row: {
          id: string;
          call_id: string;
          role: string;
          content: string;
          timestamp: string;
          token_count: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          role: string;
          content: string;
          timestamp?: string;
          token_count?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          role?: string;
          content?: string;
          timestamp?: string;
          token_count?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      call_recordings: {
        Row: {
          id: string;
          call_id: string;
          tenant_id: string;
          storage_path: string;
          duration_seconds: number;
          file_size_bytes: number | null;
          format: string;
          is_redacted: boolean;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          tenant_id: string;
          storage_path: string;
          duration_seconds: number;
          file_size_bytes?: number | null;
          format?: string;
          is_redacted?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          tenant_id?: string;
          storage_path?: string;
          duration_seconds?: number;
          file_size_bytes?: number | null;
          format?: string;
          is_redacted?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      call_transcripts: {
        Row: {
          id: string;
          call_id: string;
          tenant_id: string;
          content: string;
          segments: Json | null;
          language: string;
          provider: string;
          is_redacted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          tenant_id: string;
          content: string;
          segments?: Json | null;
          language?: string;
          provider?: string;
          is_redacted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          tenant_id?: string;
          content?: string;
          segments?: Json | null;
          language?: string;
          provider?: string;
          is_redacted?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      call_summaries: {
        Row: {
          id: string;
          call_id: string;
          tenant_id: string;
          summary: string;
          key_points: Json | null;
          action_items: Json | null;
          sentiment: string | null;
          model: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          tenant_id: string;
          summary: string;
          key_points?: Json | null;
          action_items?: Json | null;
          sentiment?: string | null;
          model?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          tenant_id?: string;
          summary?: string;
          key_points?: Json | null;
          action_items?: Json | null;
          sentiment?: string | null;
          model?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      call_outcomes: {
        Row: {
          id: string;
          call_id: string;
          tenant_id: string;
          outcome_type: string;
          disposition: string | null;
          notes: string | null;
          follow_up_at: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          tenant_id: string;
          outcome_type: string;
          disposition?: string | null;
          notes?: string | null;
          follow_up_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          tenant_id?: string;
          outcome_type?: string;
          disposition?: string | null;
          notes?: string | null;
          follow_up_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      call_tool_runs: {
        Row: {
          id: string;
          call_id: string;
          tool_name: string;
          input: Json | null;
          output: Json | null;
          status: string;
          duration_ms: number | null;
          error_message: string | null;
          started_at: string;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          tool_name: string;
          input?: Json | null;
          output?: Json | null;
          status?: string;
          duration_ms?: number | null;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          tool_name?: string;
          input?: Json | null;
          output?: Json | null;
          status?: string;
          duration_ms?: number | null;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      call_evaluations: {
        Row: {
          id: string;
          call_id: string;
          tenant_id: string;
          evaluator: string;
          score: number;
          max_score: number;
          criteria: Json | null;
          feedback: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          tenant_id: string;
          evaluator: string;
          score: number;
          max_score?: number;
          criteria?: Json | null;
          feedback?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          tenant_id?: string;
          evaluator?: string;
          score?: number;
          max_score?: number;
          criteria?: Json | null;
          feedback?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      call_costs: {
        Row: {
          id: string;
          call_id: string;
          tenant_id: string;
          telephony_cost: number;
          stt_cost: number;
          tts_cost: number;
          llm_cost: number;
          total_cost: number;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          tenant_id: string;
          telephony_cost?: number;
          stt_cost?: number;
          tts_cost?: number;
          llm_cost?: number;
          total_cost?: number;
          currency?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          tenant_id?: string;
          telephony_cost?: number;
          stt_cost?: number;
          tts_cost?: number;
          llm_cost?: number;
          total_cost?: number;
          currency?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      // ─── Consent Tables ────────────────────────────────────────────

      consent_records: {
        Row: {
          id: string;
          tenant_id: string;
          phone_number: string;
          consent_type: string;
          status: string;
          granted_at: string | null;
          revoked_at: string | null;
          source: string;
          ip_address: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          phone_number: string;
          consent_type: string;
          status?: string;
          granted_at?: string | null;
          revoked_at?: string | null;
          source: string;
          ip_address?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          phone_number?: string;
          consent_type?: string;
          status?: string;
          granted_at?: string | null;
          revoked_at?: string | null;
          source?: string;
          ip_address?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      consent_versions: {
        Row: {
          id: string;
          tenant_id: string;
          consent_type: string;
          version: number;
          text: string;
          effective_from: string;
          effective_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          consent_type: string;
          version: number;
          text: string;
          effective_from: string;
          effective_until?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          consent_type?: string;
          version?: number;
          text?: string;
          effective_from?: string;
          effective_until?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      suppression_entries: {
        Row: {
          id: string;
          tenant_id: string;
          phone_number: string;
          reason: string;
          source: string;
          suppressed_at: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          phone_number: string;
          reason: string;
          source: string;
          suppressed_at?: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          phone_number?: string;
          reason?: string;
          source?: string;
          suppressed_at?: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      dnc_checks: {
        Row: {
          id: string;
          tenant_id: string;
          phone_number: string;
          registry: string;
          is_listed: boolean;
          checked_at: string;
          valid_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          phone_number: string;
          registry: string;
          is_listed: boolean;
          checked_at?: string;
          valid_until?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          phone_number?: string;
          registry?: string;
          is_listed?: boolean;
          checked_at?: string;
          valid_until?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      outbound_attempts: {
        Row: {
          id: string;
          tenant_id: string;
          phone_number: string;
          call_id: string | null;
          attempt_number: number;
          status: string;
          consent_record_id: string | null;
          dnc_check_id: string | null;
          attempted_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          phone_number: string;
          call_id?: string | null;
          attempt_number?: number;
          status?: string;
          consent_record_id?: string | null;
          dnc_check_id?: string | null;
          attempted_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          phone_number?: string;
          call_id?: string | null;
          attempt_number?: number;
          status?: string;
          consent_record_id?: string | null;
          dnc_check_id?: string | null;
          attempted_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      recording_consents: {
        Row: {
          id: string;
          call_id: string;
          tenant_id: string;
          consented: boolean;
          method: string;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          tenant_id: string;
          consented: boolean;
          method?: string;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          tenant_id?: string;
          consented?: boolean;
          method?: string;
          timestamp?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      // ─── Healthcare Tables ─────────────────────────────────────────

      healthcare_providers: {
        Row: {
          id: string;
          tenant_id: string;
          npi: string | null;
          first_name: string;
          last_name: string;
          title: string | null;
          specialty: string | null;
          department: string | null;
          email: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          npi?: string | null;
          first_name: string;
          last_name: string;
          title?: string | null;
          specialty?: string | null;
          department?: string | null;
          email?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          npi?: string | null;
          first_name?: string;
          last_name?: string;
          title?: string | null;
          specialty?: string | null;
          department?: string | null;
          email?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      healthcare_services: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          department: string | null;
          duration_minutes: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          department?: string | null;
          duration_minutes?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          department?: string | null;
          duration_minutes?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      appointment_types: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          duration_minutes: number;
          buffer_minutes: number;
          color: string | null;
          is_active: boolean;
          requires_referral: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          duration_minutes?: number;
          buffer_minutes?: number;
          color?: string | null;
          is_active?: boolean;
          requires_referral?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          duration_minutes?: number;
          buffer_minutes?: number;
          color?: string | null;
          is_active?: boolean;
          requires_referral?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          tenant_id: string;
          call_id: string | null;
          provider_id: string | null;
          appointment_type_id: string | null;
          patient_name: string;
          patient_phone: string;
          patient_email: string | null;
          patient_dob: string | null;
          scheduled_at: string;
          duration_minutes: number;
          status: string;
          reason: string | null;
          notes: string | null;
          confirmed_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          external_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          call_id?: string | null;
          provider_id?: string | null;
          appointment_type_id?: string | null;
          patient_name: string;
          patient_phone: string;
          patient_email?: string | null;
          patient_dob?: string | null;
          scheduled_at: string;
          duration_minutes?: number;
          status?: string;
          reason?: string | null;
          notes?: string | null;
          confirmed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          external_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          call_id?: string | null;
          provider_id?: string | null;
          appointment_type_id?: string | null;
          patient_name?: string;
          patient_phone?: string;
          patient_email?: string | null;
          patient_dob?: string | null;
          scheduled_at?: string;
          duration_minutes?: number;
          status?: string;
          reason?: string | null;
          notes?: string | null;
          confirmed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          external_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      waitlist_entries: {
        Row: {
          id: string;
          tenant_id: string;
          call_id: string | null;
          patient_name: string;
          patient_phone: string;
          provider_id: string | null;
          appointment_type_id: string | null;
          preferred_dates: Json | null;
          priority: number;
          status: string;
          notes: string | null;
          notified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          call_id?: string | null;
          patient_name: string;
          patient_phone: string;
          provider_id?: string | null;
          appointment_type_id?: string | null;
          preferred_dates?: Json | null;
          priority?: number;
          status?: string;
          notes?: string | null;
          notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          call_id?: string | null;
          patient_name?: string;
          patient_phone?: string;
          provider_id?: string | null;
          appointment_type_id?: string | null;
          preferred_dates?: Json | null;
          priority?: number;
          status?: string;
          notes?: string | null;
          notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      patient_admin_contacts: {
        Row: {
          id: string;
          tenant_id: string;
          call_id: string | null;
          patient_name: string;
          patient_phone: string;
          patient_dob: string | null;
          contact_reason: string;
          message: string | null;
          status: string;
          assigned_to: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          call_id?: string | null;
          patient_name: string;
          patient_phone: string;
          patient_dob?: string | null;
          contact_reason: string;
          message?: string | null;
          status?: string;
          assigned_to?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          call_id?: string | null;
          patient_name?: string;
          patient_phone?: string;
          patient_dob?: string | null;
          contact_reason?: string;
          message?: string | null;
          status?: string;
          assigned_to?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      insurance_intakes: {
        Row: {
          id: string;
          tenant_id: string;
          call_id: string | null;
          patient_name: string;
          patient_phone: string;
          patient_dob: string | null;
          insurance_provider: string;
          policy_number: string | null;
          group_number: string | null;
          subscriber_name: string | null;
          subscriber_dob: string | null;
          relationship_to_subscriber: string | null;
          status: string;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          call_id?: string | null;
          patient_name: string;
          patient_phone: string;
          patient_dob?: string | null;
          insurance_provider: string;
          policy_number?: string | null;
          group_number?: string | null;
          subscriber_name?: string | null;
          subscriber_dob?: string | null;
          relationship_to_subscriber?: string | null;
          status?: string;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          call_id?: string | null;
          patient_name?: string;
          patient_phone?: string;
          patient_dob?: string | null;
          insurance_provider?: string;
          policy_number?: string | null;
          group_number?: string | null;
          subscriber_name?: string | null;
          subscriber_dob?: string | null;
          relationship_to_subscriber?: string | null;
          status?: string;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      referral_intakes: {
        Row: {
          id: string;
          tenant_id: string;
          call_id: string | null;
          patient_name: string;
          patient_phone: string;
          referring_provider: string | null;
          referring_practice: string | null;
          referral_reason: string;
          urgency: string;
          insurance_verified: boolean;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          call_id?: string | null;
          patient_name: string;
          patient_phone: string;
          referring_provider?: string | null;
          referring_practice?: string | null;
          referral_reason: string;
          urgency?: string;
          insurance_verified?: boolean;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          call_id?: string | null;
          patient_name?: string;
          patient_phone?: string;
          referring_provider?: string | null;
          referring_practice?: string | null;
          referral_reason?: string;
          urgency?: string;
          insurance_verified?: boolean;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      refill_requests: {
        Row: {
          id: string;
          tenant_id: string;
          call_id: string | null;
          patient_name: string;
          patient_phone: string;
          patient_dob: string | null;
          medication_name: string;
          medication_dosage: string | null;
          pharmacy_name: string | null;
          pharmacy_phone: string | null;
          provider_id: string | null;
          status: string;
          approved_by: string | null;
          approved_at: string | null;
          denied_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          call_id?: string | null;
          patient_name: string;
          patient_phone: string;
          patient_dob?: string | null;
          medication_name: string;
          medication_dosage?: string | null;
          pharmacy_name?: string | null;
          pharmacy_phone?: string | null;
          provider_id?: string | null;
          status?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          denied_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          call_id?: string | null;
          patient_name?: string;
          patient_phone?: string;
          patient_dob?: string | null;
          medication_name?: string;
          medication_dosage?: string | null;
          pharmacy_name?: string | null;
          pharmacy_phone?: string | null;
          provider_id?: string | null;
          status?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          denied_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      healthcare_escalations: {
        Row: {
          id: string;
          tenant_id: string;
          call_id: string | null;
          patient_name: string;
          patient_phone: string;
          escalation_type: string;
          urgency: string;
          description: string;
          assigned_to: string | null;
          status: string;
          resolved_at: string | null;
          resolution_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          call_id?: string | null;
          patient_name: string;
          patient_phone: string;
          escalation_type: string;
          urgency?: string;
          description: string;
          assigned_to?: string | null;
          status?: string;
          resolved_at?: string | null;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          call_id?: string | null;
          patient_name?: string;
          patient_phone?: string;
          escalation_type?: string;
          urgency?: string;
          description?: string;
          assigned_to?: string | null;
          status?: string;
          resolved_at?: string | null;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ─── Restaurant Tables ─────────────────────────────────────────

      restaurant_menus: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          available_from: string | null;
          available_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          available_from?: string | null;
          available_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          available_from?: string | null;
          available_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_categories: {
        Row: {
          id: string;
          menu_id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          menu_id: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          menu_id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          category_id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          price_cents: number;
          currency: string;
          calories: number | null;
          allergens: string[] | null;
          dietary_tags: string[] | null;
          image_url: string | null;
          is_available: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          price_cents: number;
          currency?: string;
          calories?: number | null;
          allergens?: string[] | null;
          dietary_tags?: string[] | null;
          image_url?: string | null;
          is_available?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          price_cents?: number;
          currency?: string;
          calories?: number | null;
          allergens?: string[] | null;
          dietary_tags?: string[] | null;
          image_url?: string | null;
          is_available?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_modifier_groups: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          min_selections: number;
          max_selections: number;
          is_required: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          min_selections?: number;
          max_selections?: number;
          is_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          min_selections?: number;
          max_selections?: number;
          is_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_modifiers: {
        Row: {
          id: string;
          group_id: string;
          tenant_id: string;
          name: string;
          price_cents: number;
          is_available: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          tenant_id: string;
          name: string;
          price_cents?: number;
          is_available?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          tenant_id?: string;
          name?: string;
          price_cents?: number;
          is_available?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      menu_availability: {
        Row: {
          id: string;
          menu_id: string;
          tenant_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          menu_id: string;
          tenant_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          menu_id?: string;
          tenant_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      restaurant_tables: {
        Row: {
          id: string;
          tenant_id: string;
          location_id: string | null;
          table_number: string;
          capacity: number;
          section: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          location_id?: string | null;
          table_number: string;
          capacity: number;
          section?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          location_id?: string | null;
          table_number?: string;
          capacity?: number;
          section?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          id: string;
          tenant_id: string;
          call_id: string | null;
          table_id: string | null;
          location_id: string | null;
          guest_name: string;
          guest_phone: string;
          guest_email: string | null;
          party_size: number;
          scheduled_at: string;
          duration_minutes: number;
          status: string;
          special_requests: string | null;
          confirmed_at: string | null;
          cancelled_at: string | null;
          no_show_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          call_id?: string | null;
          table_id?: string | null;
          location_id?: string | null;
          guest_name: string;
          guest_phone: string;
          guest_email?: string | null;
          party_size: number;
          scheduled_at: string;
          duration_minutes?: number;
          status?: string;
          special_requests?: string | null;
          confirmed_at?: string | null;
          cancelled_at?: string | null;
          no_show_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          call_id?: string | null;
          table_id?: string | null;
          location_id?: string | null;
          guest_name?: string;
          guest_phone?: string;
          guest_email?: string | null;
          party_size?: number;
          scheduled_at?: string;
          duration_minutes?: number;
          status?: string;
          special_requests?: string | null;
          confirmed_at?: string | null;
          cancelled_at?: string | null;
          no_show_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          tenant_id: string;
          call_id: string | null;
          reservation_id: string | null;
          order_number: string;
          order_type: string;
          status: string;
          customer_name: string;
          customer_phone: string;
          subtotal_cents: number;
          tax_cents: number;
          tip_cents: number;
          total_cents: number;
          currency: string;
          special_instructions: string | null;
          estimated_ready_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          call_id?: string | null;
          reservation_id?: string | null;
          order_number: string;
          order_type: string;
          status?: string;
          customer_name: string;
          customer_phone: string;
          subtotal_cents?: number;
          tax_cents?: number;
          tip_cents?: number;
          total_cents?: number;
          currency?: string;
          special_instructions?: string | null;
          estimated_ready_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          call_id?: string | null;
          reservation_id?: string | null;
          order_number?: string;
          order_type?: string;
          status?: string;
          customer_name?: string;
          customer_phone?: string;
          subtotal_cents?: number;
          tax_cents?: number;
          tip_cents?: number;
          total_cents?: number;
          currency?: string;
          special_instructions?: string | null;
          estimated_ready_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string | null;
          name: string;
          quantity: number;
          unit_price_cents: number;
          modifiers: Json | null;
          special_instructions: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id?: string | null;
          name: string;
          quantity?: number;
          unit_price_cents: number;
          modifiers?: Json | null;
          special_instructions?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string | null;
          name?: string;
          quantity?: number;
          unit_price_cents?: number;
          modifiers?: Json | null;
          special_instructions?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      catering_leads: {
        Row: {
          id: string;
          tenant_id: string;
          call_id: string | null;
          contact_name: string;
          contact_phone: string;
          contact_email: string | null;
          event_date: string | null;
          event_type: string | null;
          guest_count: number | null;
          budget_cents: number | null;
          dietary_requirements: string | null;
          venue_address: string | null;
          status: string;
          notes: string | null;
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          call_id?: string | null;
          contact_name: string;
          contact_phone: string;
          contact_email?: string | null;
          event_date?: string | null;
          event_type?: string | null;
          guest_count?: number | null;
          budget_cents?: number | null;
          dietary_requirements?: string | null;
          venue_address?: string | null;
          status?: string;
          notes?: string | null;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          call_id?: string | null;
          contact_name?: string;
          contact_phone?: string;
          contact_email?: string | null;
          event_date?: string | null;
          event_type?: string | null;
          guest_count?: number | null;
          budget_cents?: number | null;
          dietary_requirements?: string | null;
          venue_address?: string | null;
          status?: string;
          notes?: string | null;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurant_complaints: {
        Row: {
          id: string;
          tenant_id: string;
          call_id: string | null;
          order_id: string | null;
          reservation_id: string | null;
          customer_name: string;
          customer_phone: string;
          complaint_type: string;
          description: string;
          severity: string;
          status: string;
          resolution: string | null;
          compensation_offered: string | null;
          assigned_to: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          call_id?: string | null;
          order_id?: string | null;
          reservation_id?: string | null;
          customer_name: string;
          customer_phone: string;
          complaint_type: string;
          description: string;
          severity?: string;
          status?: string;
          resolution?: string | null;
          compensation_offered?: string | null;
          assigned_to?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          call_id?: string | null;
          order_id?: string | null;
          reservation_id?: string | null;
          customer_name?: string;
          customer_phone?: string;
          complaint_type?: string;
          description?: string;
          severity?: string;
          status?: string;
          resolution?: string | null;
          compensation_offered?: string | null;
          assigned_to?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ─── Real Estate Tables ────────────────────────────────────────

      re_agents: {
        Row: {
          id: string;
          tenant_id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          license_number: string | null;
          license_state: string | null;
          specializations: string[] | null;
          bio: string | null;
          photo_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          license_number?: string | null;
          license_state?: string | null;
          specializations?: string[] | null;
          bio?: string | null;
          photo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          license_number?: string | null;
          license_state?: string | null;
          specializations?: string[] | null;
          bio?: string | null;
          photo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          tenant_id: string;
          agent_id: string | null;
          mls_number: string | null;
          status: string;
          listing_type: string;
          property_type: string;
          address_line1: string;
          address_line2: string | null;
          city: string;
          state: string;
          zip: string;
          county: string | null;
          price_cents: number;
          currency: string;
          bedrooms: number | null;
          bathrooms: number | null;
          square_feet: number | null;
          lot_size_sqft: number | null;
          year_built: number | null;
          description: string | null;
          features: Json | null;
          photos: Json | null;
          virtual_tour_url: string | null;
          listed_at: string | null;
          sold_at: string | null;
          sold_price_cents: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          agent_id?: string | null;
          mls_number?: string | null;
          status?: string;
          listing_type: string;
          property_type: string;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          state: string;
          zip: string;
          county?: string | null;
          price_cents: number;
          currency?: string;
          bedrooms?: number | null;
          bathrooms?: number | null;
          square_feet?: number | null;
          lot_size_sqft?: number | null;
          year_built?: number | null;
          description?: string | null;
          features?: Json | null;
          photos?: Json | null;
          virtual_tour_url?: string | null;
          listed_at?: string | null;
          sold_at?: string | null;
          sold_price_cents?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          agent_id?: string | null;
          mls_number?: string | null;
          status?: string;
          listing_type?: string;
          property_type?: string;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          state?: string;
          zip?: string;
          county?: string | null;
          price_cents?: number;
          currency?: string;
          bedrooms?: number | null;
          bathrooms?: number | null;
          square_feet?: number | null;
          lot_size_sqft?: number | null;
          year_built?: number | null;
          description?: string | null;
          features?: Json | null;
          photos?: Json | null;
          virtual_tour_url?: string | null;
          listed_at?: string | null;
          sold_at?: string | null;
          sold_price_cents?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      listing_facts: {
        Row: {
          id: string;
          listing_id: string;
          tenant_id: string;
          category: string;
          label: string;
          value: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          tenant_id: string;
          category: string;
          label: string;
          value: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          tenant_id?: string;
          category?: string;
          label?: string;
          value?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      real_estate_leads: {
        Row: {
          id: string;
          tenant_id: string;
          call_id: string | null;
          agent_id: string | null;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string;
          lead_type: string;
          source: string | null;
          status: string;
          budget_min_cents: number | null;
          budget_max_cents: number | null;
          preferred_locations: Json | null;
          property_preferences: Json | null;
          timeline: string | null;
          notes: string | null;
          score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          call_id?: string | null;
          agent_id?: string | null;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone: string;
          lead_type: string;
          source?: string | null;
          status?: string;
          budget_min_cents?: number | null;
          budget_max_cents?: number | null;
          preferred_locations?: Json | null;
          property_preferences?: Json | null;
          timeline?: string | null;
          notes?: string | null;
          score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          call_id?: string | null;
          agent_id?: string | null;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string;
          lead_type?: string;
          source?: string | null;
          status?: string;
          budget_min_cents?: number | null;
          budget_max_cents?: number | null;
          preferred_locations?: Json | null;
          property_preferences?: Json | null;
          timeline?: string | null;
          notes?: string | null;
          score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lead_qualifications: {
        Row: {
          id: string;
          lead_id: string;
          tenant_id: string;
          question: string;
          answer: string | null;
          score: number | null;
          asked_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          tenant_id: string;
          question: string;
          answer?: string | null;
          score?: number | null;
          asked_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          tenant_id?: string;
          question?: string;
          answer?: string | null;
          score?: number | null;
          asked_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      showings: {
        Row: {
          id: string;
          tenant_id: string;
          listing_id: string;
          lead_id: string | null;
          agent_id: string | null;
          call_id: string | null;
          scheduled_at: string;
          duration_minutes: number;
          status: string;
          feedback: string | null;
          interest_level: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          listing_id: string;
          lead_id?: string | null;
          agent_id?: string | null;
          call_id?: string | null;
          scheduled_at: string;
          duration_minutes?: number;
          status?: string;
          feedback?: string | null;
          interest_level?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          listing_id?: string;
          lead_id?: string | null;
          agent_id?: string | null;
          call_id?: string | null;
          scheduled_at?: string;
          duration_minutes?: number;
          status?: string;
          feedback?: string | null;
          interest_level?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      valuation_appointments: {
        Row: {
          id: string;
          tenant_id: string;
          agent_id: string | null;
          call_id: string | null;
          owner_name: string;
          owner_phone: string;
          owner_email: string | null;
          property_address: string;
          property_type: string | null;
          scheduled_at: string;
          status: string;
          estimated_value_cents: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          agent_id?: string | null;
          call_id?: string | null;
          owner_name: string;
          owner_phone: string;
          owner_email?: string | null;
          property_address: string;
          property_type?: string | null;
          scheduled_at: string;
          status?: string;
          estimated_value_cents?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          agent_id?: string | null;
          call_id?: string | null;
          owner_name?: string;
          owner_phone?: string;
          owner_email?: string | null;
          property_address?: string;
          property_type?: string | null;
          scheduled_at?: string;
          status?: string;
          estimated_value_cents?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lead_assignments: {
        Row: {
          id: string;
          tenant_id: string;
          lead_id: string;
          agent_id: string;
          assigned_by: string | null;
          status: string;
          assigned_at: string;
          accepted_at: string | null;
          declined_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          lead_id: string;
          agent_id: string;
          assigned_by?: string | null;
          status?: string;
          assigned_at?: string;
          accepted_at?: string | null;
          declined_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          lead_id?: string;
          agent_id?: string;
          assigned_by?: string | null;
          status?: string;
          assigned_at?: string;
          accepted_at?: string | null;
          declined_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      property_management_units: {
        Row: {
          id: string;
          tenant_id: string;
          listing_id: string | null;
          unit_number: string;
          address: string;
          property_type: string;
          status: string;
          tenant_name: string | null;
          tenant_phone: string | null;
          tenant_email: string | null;
          lease_start: string | null;
          lease_end: string | null;
          rent_cents: number | null;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          listing_id?: string | null;
          unit_number: string;
          address: string;
          property_type: string;
          status?: string;
          tenant_name?: string | null;
          tenant_phone?: string | null;
          tenant_email?: string | null;
          lease_start?: string | null;
          lease_end?: string | null;
          rent_cents?: number | null;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          listing_id?: string | null;
          unit_number?: string;
          address?: string;
          property_type?: string;
          status?: string;
          tenant_name?: string | null;
          tenant_phone?: string | null;
          tenant_email?: string | null;
          lease_start?: string | null;
          lease_end?: string | null;
          rent_cents?: number | null;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      maintenance_requests: {
        Row: {
          id: string;
          tenant_id: string;
          unit_id: string;
          call_id: string | null;
          reporter_name: string;
          reporter_phone: string;
          category: string;
          description: string;
          priority: string;
          status: string;
          assigned_to: string | null;
          scheduled_at: string | null;
          completed_at: string | null;
          cost_cents: number | null;
          notes: string | null;
          photos: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          unit_id: string;
          call_id?: string | null;
          reporter_name: string;
          reporter_phone: string;
          category: string;
          description: string;
          priority?: string;
          status?: string;
          assigned_to?: string | null;
          scheduled_at?: string | null;
          completed_at?: string | null;
          cost_cents?: number | null;
          notes?: string | null;
          photos?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          unit_id?: string;
          call_id?: string | null;
          reporter_name?: string;
          reporter_phone?: string;
          category?: string;
          description?: string;
          priority?: string;
          status?: string;
          assigned_to?: string | null;
          scheduled_at?: string | null;
          completed_at?: string | null;
          cost_cents?: number | null;
          notes?: string | null;
          photos?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ─── Operations Tables ─────────────────────────────────────────

      usage_limits: {
        Row: {
          id: string;
          tenant_id: string;
          resource: string;
          limit_value: number;
          period: string;
          is_hard_limit: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          resource: string;
          limit_value: number;
          period: string;
          is_hard_limit?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          resource?: string;
          limit_value?: number;
          period?: string;
          is_hard_limit?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      usage_ledger: {
        Row: {
          id: string;
          tenant_id: string;
          resource: string;
          quantity: number;
          unit: string;
          reference_type: string | null;
          reference_id: string | null;
          recorded_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          resource: string;
          quantity: number;
          unit: string;
          reference_type?: string | null;
          reference_id?: string | null;
          recorded_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          resource?: string;
          quantity?: number;
          unit?: string;
          reference_type?: string | null;
          reference_id?: string | null;
          recorded_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      billing_accounts: {
        Row: {
          id: string;
          tenant_id: string;
          stripe_customer_id: string | null;
          plan: string;
          status: string;
          trial_ends_at: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancelled_at: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          stripe_customer_id?: string | null;
          plan?: string;
          status?: string;
          trial_ends_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancelled_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          stripe_customer_id?: string | null;
          plan?: string;
          status?: string;
          trial_ends_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancelled_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          channel: string;
          type: string;
          title: string;
          body: string;
          data: Json | null;
          is_read: boolean;
          read_at: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          channel: string;
          type: string;
          title: string;
          body: string;
          data?: Json | null;
          is_read?: boolean;
          read_at?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string | null;
          channel?: string;
          type?: string;
          title?: string;
          body?: string;
          data?: Json | null;
          is_read?: boolean;
          read_at?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      jobs: {
        Row: {
          id: string;
          tenant_id: string;
          queue: string;
          type: string;
          payload: Json;
          status: string;
          priority: number;
          max_attempts: number;
          scheduled_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          failed_at: string | null;
          error_message: string | null;
          result: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          queue: string;
          type: string;
          payload: Json;
          status?: string;
          priority?: number;
          max_attempts?: number;
          scheduled_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          failed_at?: string | null;
          error_message?: string | null;
          result?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          queue?: string;
          type?: string;
          payload?: Json;
          status?: string;
          priority?: number;
          max_attempts?: number;
          scheduled_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          failed_at?: string | null;
          error_message?: string | null;
          result?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      job_attempts: {
        Row: {
          id: string;
          job_id: string;
          attempt_number: number;
          started_at: string;
          completed_at: string | null;
          status: string;
          error_message: string | null;
          error_stack: string | null;
          duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          attempt_number: number;
          started_at?: string;
          completed_at?: string | null;
          status?: string;
          error_message?: string | null;
          error_stack?: string | null;
          duration_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          attempt_number?: number;
          started_at?: string;
          completed_at?: string | null;
          status?: string;
          error_message?: string | null;
          error_stack?: string | null;
          duration_ms?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      idempotency_keys: {
        Row: {
          id: string;
          key: string;
          tenant_id: string;
          response: Json | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          tenant_id: string;
          response?: Json | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          tenant_id?: string;
          response?: Json | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
