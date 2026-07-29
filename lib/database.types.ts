// Type de schéma Supabase, écrit à la main d'après supabase/schema.sql (pas
// de CLI Supabase dans cet environnement pour le générer automatiquement).
// À régénérer avec `npx supabase gen types typescript` si le schéma change
// et que ce fichier diverge.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SeatsByCabinJson = Record<string, { sold: number; capacity: number; pad?: number }>;

// `Relationships` est requis par le type `GenericTable` de postgrest-js pour
// que `Schema extends GenericSchema` reste vrai (sinon les lignes retournées
// par `.select()` s'effondrent silencieusement en `never`) — voir les
// contraintes de foreign key dans supabase/schema.sql pour la liste.
type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          pseudo: string;
          seniority_date: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          pseudo: string;
          seniority_date?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: Relationship[];
      };
      leagues: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_by: string;
          show_consensus: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code?: string;
          created_by: string;
          show_consensus?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leagues']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'leagues_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      league_members: {
        Row: {
          league_id: string;
          user_id: string;
          role: string;
          total_points: number;
          joined_at: string;
        };
        Insert: {
          league_id: string;
          user_id: string;
          role?: string;
          total_points?: number;
          joined_at?: string;
        };
        Update: Partial<Database['public']['Tables']['league_members']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'league_members_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'league_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      flights: {
        Row: {
          id: string;
          league_id: string;
          created_by: string;
          flight_number: string;
          flight_date: string;
          origin: string | null;
          destination: string | null;
          scheduled_departure: string;
          aircraft_type: string | null;
          airline_code: string | null;
          data_tier: string;
          ticket_type: string | null;
          status: string;
          actual_boarded: boolean | null;
          actual_class: string | null;
          actual_seats_remaining: number | null;
          resolved_at: string | null;
          reminder_sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          created_by: string;
          flight_number: string;
          flight_date: string;
          origin?: string | null;
          destination?: string | null;
          scheduled_departure: string;
          aircraft_type?: string | null;
          airline_code?: string | null;
          data_tier?: string;
          ticket_type?: string | null;
          status?: string;
          actual_boarded?: boolean | null;
          actual_class?: string | null;
          actual_seats_remaining?: number | null;
          resolved_at?: string | null;
          reminder_sent_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['flights']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'flights_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'flights_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      flight_load_updates: {
        Row: {
          id: string;
          flight_id: string;
          submitted_by: string;
          recorded_at: string;
          seats_by_cabin: SeatsByCabinJson;
          r1_count: number | null;
          difficulty: number | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          flight_id: string;
          submitted_by: string;
          recorded_at?: string;
          seats_by_cabin?: SeatsByCabinJson;
          r1_count?: number | null;
          difficulty?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['flight_load_updates']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'flight_load_updates_flight_id_fkey';
            columns: ['flight_id'];
            isOneToOne: false;
            referencedRelation: 'flights';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'flight_load_updates_submitted_by_fkey';
            columns: ['submitted_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      bets: {
        Row: {
          id: string;
          flight_id: string;
          user_id: string;
          predicted_boarded: boolean;
          predicted_class: string | null;
          predicted_seats_remaining: number | null;
          points_awarded: number | null;
          placed_at: string;
          edit_count: number;
        };
        Insert: {
          id?: string;
          flight_id: string;
          user_id: string;
          predicted_boarded: boolean;
          predicted_class?: string | null;
          predicted_seats_remaining?: number | null;
          points_awarded?: number | null;
          placed_at?: string;
          edit_count?: number;
        };
        Update: Partial<Database['public']['Tables']['bets']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'bets_flight_id_fkey';
            columns: ['flight_id'];
            isOneToOne: false;
            referencedRelation: 'flights';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bets_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
