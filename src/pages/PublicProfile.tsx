import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { UserRating } from '@/components/UserRating';
import { AmbassadorBadge } from '@/components/AmbassadorBadge';
import { TrustTierBadge } from '@/components/TrustTier';
import { ArrowLeft, Star, Briefcase, Calendar, GraduationCap, Video } from 'lucide-react';
import { format } from 'date-fns';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  skills: string[] | null;
  average_rating: number | null;
  completed_gigs: number | null;
  created_at: string;
  university: string | null;
  is_ambassador?: boolean;
  is_verified?: boolean;
  intro_video_url?: string | null;
}

interface Gig {
  id: string;
  title: string;
  description: string;
  price_kobo: number;
  category: string;
  status: string;
  created_at: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: { full_name: string | null; avatar_url: string | null };
}

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) fetchProfile(); }, [id]);

  const fetchProfile = async () => {
    try {
      const { data: profileData, error } = await supabase.from('profiles').select('id, full_name, avatar_url, bio, skills, average_rating, completed_gigs, created_at, university, is_ambassador, is_verified, intro_video_url').eq('id', id).single();
      if (error) throw error;
      setProfile(profileData as Profile);

      const { data: gigsData } = await supabase.from('tasks').select('id, title, description, price_kobo, category, status, created_at').eq('poster_id', id!).eq('status', 'open').order('created_at', { ascending: false }).limit(6);
      setGigs(gigsData || []);

      const { data: reviewsData } = await supabase.from('reviews').select('id, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)').eq('reviewee_id', id!).order('created_at', { ascending: false }).limit(10);
      setReviews(reviewsData as unknown as Review[] || []);
    } catch { console.error('Error fetching profile'); }
    finally { setLoading(false); }
  };

  const formatNaira = (kobo: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(kobo / 100);

  if (loading) return <div className="min-h-screen bg-background"><div className="container mx-auto px-4 py-8 max-w-4xl"><Skeleton className="h-40 w-full mb-6" /><Skeleton className="h-64 w-full" /></div></div>;
  if (!profile) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center"><h2 className="text-xl font-semibold mb-4">User not found</h2><Button onClick={() => navigate('/gigs')}>Browse Gigs</Button></div></div>;

  const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : (profile.average_rating || 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="font-semibold">Profile</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-3xl">{profile.full_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl font-bold text-foreground">{profile.full_name || 'Anonymous User'}</h1>
                  {profile.is_ambassador && <AmbassadorBadge />}
                  <TrustTierBadge completed={profile.completed_gigs} rating={averageRating} isVerified={profile.is_verified} />
                </div>
                
                {profile.university && (
                  <Badge variant="secondary" className="mb-3 flex items-center gap-1 w-fit">
                    <GraduationCap className="h-3 w-3" />{profile.university}
                  </Badge>
                )}
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Joined {format(new Date(profile.created_at), 'MMM yyyy')}</span>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <UserRating rating={averageRating} />
                  <span className="text-sm text-muted-foreground">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                </div>

                {profile.bio && <p className="text-muted-foreground mb-4">{profile.bio}</p>}

                {profile.skills && profile.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, i) => <Badge key={i} variant="secondary">{skill}</Badge>)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {profile.intro_video_url && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Video className="h-4 w-4 text-primary" />Intro video</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
                <video src={profile.intro_video_url} controls playsInline className="h-full w-full object-cover" />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-primary">{profile.completed_gigs || 0}</p><p className="text-sm text-muted-foreground">Gigs Done</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-foreground">{averageRating.toFixed(1)}</p><p className="text-sm text-muted-foreground">Rating</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-foreground">{reviews.length}</p><p className="text-sm text-muted-foreground">Reviews</p></CardContent></Card>
        </div>

        {gigs.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" />Active Gigs</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {gigs.map((gig) => (
                  <Card key={gig.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/gigs/${gig.id}`)}>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{gig.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{gig.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{gig.category}</Badge>
                        <span className="font-bold text-primary">{formatNaira(gig.price_kobo)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5" />Reviews</CardTitle></CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No reviews yet</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="flex gap-4 p-4 rounded-lg bg-muted/50">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.reviewer?.avatar_url || undefined} />
                      <AvatarFallback>{review.reviewer?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">{review.reviewer?.full_name || 'Anonymous'}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(review.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      <UserRating rating={review.rating} />
                      {review.comment && <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
