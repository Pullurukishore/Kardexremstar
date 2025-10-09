import { useState, useEffect, FormEvent } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api/axios';

interface CommentUser {
  id: number;
  name: string;
  email: string;
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: CommentUser;
}

export function TicketComments({ ticketId }: { ticketId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchComments = async () => {
    try {
      const response = await api.get(`/tickets/${ticketId}/comments`);
      setComments(response.data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive',
      });
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [ticketId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const response = await api.post(`/tickets/${ticketId}/comments`, {
        content: newComment.trim(),
      });
      
      // Add new comment to the top of the list
      setComments(prevComments => [response.data, ...prevComments]);
      setNewComment('');
      
      toast({
        title: 'Success',
        description: 'Comment added successfully',
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Comment Form */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Add a comment</label>
              <Textarea
                placeholder="Type your comment here..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="resize-none border-border/50 focus:border-primary/50"
                disabled={submitting}
              />
            </div>
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={!newComment.trim() || submitting}
                className="bg-primary hover:bg-primary/90"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                    Posting...
                  </>
                ) : (
                  'Post Comment'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <Card className="border-dashed border-border/50">
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground space-y-2">
                <div className="text-lg font-medium">No comments yet</div>
                <div className="text-sm">Be the first to share your thoughts on this ticket</div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {comments.map((comment, index) => (
              <Card 
                key={comment.id} 
                className={`border-border/50 shadow-sm transition-all duration-200 hover:shadow-md ${index === 0 ? 'border-l-4 border-l-primary/50' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex space-x-4">
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      <Avatar className="h-10 w-10 border-2 border-border/50">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {comment.user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    {/* Comment Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {comment.user.name}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {comment.user.email}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.createdAt), 'h:mm a')}
                          </span>
                        </div>
                      </div>
                      
                      {/* Comment Text */}
                      <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
