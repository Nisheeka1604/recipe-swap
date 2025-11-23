import { useState, useEffect } from "react";

export default function CommentsList({ recipeId }) {
  const [comments, setComments] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadComments = async () => {
    if (loading || !hasMore) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/recipes/${recipeId}/comments?page=${page}`);
      if (!res.ok) throw new Error("Failed to fetch comments");

      const data = await res.json();

      if (data.comments.length === 0) {
        setHasMore(false);
      } else {
        setComments(prev => [...prev, ...data.comments]);
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="comments-list">
      {comments.map(c => (
        <div key={c.id} className="comment-item">
          <p><strong>{c.user}</strong>: {c.text}</p>
        </div>
      ))}

      {hasMore && (
        <button onClick={() => setPage(page + 1)} disabled={loading} className="load-more-btn">
          {loading ? "Loading..." : "Load More"}
        </button>
      )}

      {!hasMore && comments.length > 0 && <p>No more comments</p>}
      {comments.length === 0 && !loading && <p>No comments yet</p>}
    </div>
  );
}
