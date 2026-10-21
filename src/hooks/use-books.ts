import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { requireSupabase } from "@/lib/supabase";
import type { CoverColor } from "@/constants/theme";
import type { ListedBook } from "@/types/book";

const coverPalette: CoverColor[] = ["green", "blue", "rust", "purple", "navy"];

function coverColor(id: string): CoverColor {
  const hash = [...id].reduce((value, char) => value + char.charCodeAt(0), 0);
  return coverPalette[hash % coverPalette.length];
}

export function useSearchBooks(search: string, city: string | null) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["search-books", userId, city, search],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ListedBook[]> => {
      const client = requireSupabase();
      let request = client
        .from("library_books")
        .select(
          "id,owner_id,title,author,cover_url,profiles!library_books_owner_id_fkey(display_name,city,neighborhood)",
        )
        .eq("status", "available")
        .neq("owner_id", userId!);
      if (city) request = request.eq("profiles.city", city);
      if (search.trim()) {
        request = request.textSearch("search", search.trim(), {
          type: "websearch",
          config: "simple",
        });
      }
      const { data, error } = await request.order("added_at", { ascending: false });
      if (error) throw error;
      return data.flatMap((row) => {
        const owner = row.profiles;
        if (!owner) return [];
        return [{
          id: row.id,
          ownerId: row.owner_id,
          title: row.title,
          author: row.author,
          ownerName: owner.display_name,
          neighborhood: owner.neighborhood ?? owner.city,
          coverColor: coverColor(row.id),
          coverUrl: row.cover_url,
        }];
      });
    },
  });
}

export function useBookDetails(id: string | undefined) {
  return useQuery({
    queryKey: ["book-details", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from("library_books")
        .select(
          "id,owner_id,title,author,cover_url,personal_rating,personal_review,status,profiles!library_books_owner_id_fkey(display_name,city,neighborhood,avatar_path)",
        )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data || !data.profiles) return null;
      return {
        id: data.id,
        ownerId: data.owner_id,
        title: data.title,
        author: data.author,
        coverUrl: data.cover_url,
        personalRating: data.personal_rating,
        personalReview: data.personal_review,
        status: data.status,
        owner: {
          displayName: data.profiles.display_name,
          city: data.profiles.city,
          neighborhood: data.profiles.neighborhood,
          avatarUrl: data.profiles.avatar_path,
        },
      };
    },
  });
}

export function usePublicProfile(id: string | undefined) {
  return useQuery({
    queryKey: ["public-profile", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const client = requireSupabase();
      const { data: profile, error } = await client
        .from("profiles")
        .select("id,display_name,city,neighborhood,avatar_path")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!profile) return null;

      const { data: books, error: booksError } = await client
        .from("library_books")
        .select("id,title,author,cover_url")
        .eq("owner_id", id!)
        .eq("status", "available")
        .order("added_at", { ascending: false });
      if (booksError) throw booksError;

      return {
        id: profile.id,
        displayName: profile.display_name,
        city: profile.city,
        neighborhood: profile.neighborhood,
        avatarUrl: profile.avatar_path,
        books: books.map((book) => ({
          id: book.id,
          ownerId: profile.id,
          title: book.title,
          author: book.author,
          ownerName: profile.display_name,
          neighborhood: profile.neighborhood ?? profile.city,
          coverColor: coverColor(book.id),
          coverUrl: book.cover_url,
        })),
      };
    },
  });
}
