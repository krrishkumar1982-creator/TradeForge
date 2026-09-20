import React, { useState } from 'react';
import {
  MessageSquare,
  Heart,
  Trophy,
  Send,
  Trash2,
  Radio,
  CornerDownRight,
  Loader2
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export const TradersLoungeView: React.FC = () => {
  const {
    communityPosts,
    currentUserId,
    toggleLikePost,
    addCommunityPost,
    deleteCommunityPost,
    addPostComment,
    deletePostComment,
    leaderboard,
    updateUserPointsAdmin,
    updateUserRoleAdmin,
    userProfile,
  } = useTrading();

  const [postContent, setPostContent] = useState('');
  const [symbol, setSymbol] = useState('MES');
  const [pnl, setPnl] = useState('+$650.00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expanded post comments state
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  // Leaderboard Admin controls state
  const [selectedAdminUser, setSelectedAdminUser] = useState<any | null>(null);
  const [adminPoints, setAdminPoints] = useState<number>(0);
  const [adminRole, setAdminRole] = useState<string>('USER');
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addCommunityPost(postContent, symbol, pnl, '+2.50R');
      setPostContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim() || submittingComment[postId]) return;

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      await addPostComment(postId, text.trim());
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#1C232E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-400" />
            Traders Lounge & Community Feed
            <span className="inline-flex items-center gap-1.5 ml-2 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
              Live Multi-User
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Share verified executions, discuss market structure setups, and learn from top performers
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Composer + Feed */}
        <div className="lg:col-span-8 space-y-4">
          {/* Post Composer */}
          <form onSubmit={handlePost} className="rounded-2xl border border-[#1C232E] bg-[#12161D] p-4 shadow-xl backdrop-blur-sm space-y-3">
            <textarea
              rows={3}
              placeholder="Share a trade thesis, liquidity sweep observation, or psychological takeaway..."
              value={postContent}
              onChange={e => setPostContent(e.target.value)}
              className="w-full rounded-xl bg-[#0A0D14] border border-[#1C232E] p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Symbol (e.g. MES)"
                  value={symbol}
                  onChange={e => setSymbol(e.target.value)}
                  className="w-24 bg-[#0A0D14] border border-[#1C232E] rounded-lg px-2.5 py-1 text-xs text-slate-200 uppercase"
                />
                <input
                  type="text"
                  placeholder="P&L (e.g. +$650)"
                  value={pnl}
                  onChange={e => setPnl(e.target.value)}
                  className="w-28 bg-[#0A0D14] border border-[#1C232E] rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !postContent.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-blue-600/20"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Post Idea</span>
              </button>
            </div>
          </form>

          {/* Posts Feed */}
          <div className="space-y-4">
            {communityPosts.length === 0 ? (
              <div className="rounded-2xl border border-[#1C232E] bg-[#12161D] p-8 text-center text-xs text-slate-400">
                No community posts yet. Be the first trader to share a trade idea!
              </div>
            ) : (
              communityPosts.map(post => {
                const isOwner = post.userId === currentUserId;
                const isCommentsOpen = !!expandedComments[post.id];
                const comments = post.comments || [];

                return (
                  <div
                    key={post.id}
                    className="rounded-2xl border border-[#1C232E] bg-[#12161D] p-5 shadow-xl backdrop-blur-sm space-y-3"
                  >
                    {/* Author Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={post.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
                          alt={post.authorName}
                          className="w-10 h-10 rounded-full object-cover border border-[#273141]"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-100">{post.authorName}</span>
                            {post.badge && (
                              <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded font-bold">
                                {post.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {post.authorHandle} • {post.timestamp}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {post.symbol && (
                          <span className="text-xs font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                            {post.symbol}
                          </span>
                        )}
                        {post.pnl && (
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {post.pnl}
                          </span>
                        )}
                        {isOwner && (
                          <button
                            onClick={() => deleteCommunityPost(post.id)}
                            title="Delete Post"
                            className="p-1 text-slate-500 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">{post.content}</p>

                    {/* Image if any */}
                    {post.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-[#1C232E] max-h-60">
                        <img src={post.imageUrl} alt="Trade Chart" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-2 border-t border-[#1C232E] text-xs text-slate-400">
                      <button
                        onClick={() => toggleLikePost(post.id)}
                        className={`flex items-center gap-1.5 transition ${
                          post.hasLiked ? 'text-rose-400 font-bold' : 'hover:text-slate-200'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                        <span>{post.likes}</span>
                      </button>

                      <button
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-1.5 hover:text-slate-200 transition"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.commentsCount || comments.length} comments</span>
                      </button>
                    </div>

                    {/* Expanded Comments Section */}
                    {isCommentsOpen && (
                      <div className="pt-3 border-t border-[#1C232E] space-y-3">
                        {/* List Comments */}
                        {comments.length > 0 && (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {comments.map((comment) => {
                              const canDeleteComment =
                                comment.userId === currentUserId || isOwner;
                              return (
                                <div
                                  key={comment.id}
                                  className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-xs"
                                >
                                  <div className="flex items-start gap-2">
                                    <img
                                      src={comment.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
                                      alt={comment.author}
                                      className="w-6 h-6 rounded-full object-cover border border-[#273141] mt-0.5"
                                    />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-200 text-[11px]">
                                          {comment.author}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                          {comment.time}
                                        </span>
                                      </div>
                                      <p className="text-slate-300 text-[11px] mt-0.5">{comment.text}</p>
                                    </div>
                                  </div>

                                  {canDeleteComment && (
                                    <button
                                      onClick={() => deletePostComment(post.id, comment.id)}
                                      title="Delete Comment"
                                      className="text-slate-500 hover:text-rose-400 transition p-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Add Comment Input */}
                        <div className="flex items-center gap-2 pt-1">
                          <CornerDownRight className="w-4 h-4 text-slate-500 shrink-0" />
                          <input
                            type="text"
                            placeholder="Write a reply..."
                            value={commentInputs[post.id] || ''}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddComment(post.id);
                            }}
                            className="flex-1 bg-[#0A0D14] border border-[#1C232E] rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={!commentInputs[post.id]?.trim() || submittingComment[post.id]}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold"
                          >
                            {submittingComment[post.id] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              'Reply'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 4 Cols: Verified Leaderboard */}
        <div className="lg:col-span-4 rounded-2xl border border-[#1C232E] bg-[#12161D] p-5 shadow-xl backdrop-blur-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Verified Trader Leaderboard
          </h3>

          <div className="space-y-2.5">
            {leaderboard.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4 font-mono">
                No active public traders found.
              </p>
            ) : (
              leaderboard.map((item) => {
                const isAdmin = userProfile?.role === 'ADMIN';
                const isSelected = selectedAdminUser?.userId === item.userId;

                return (
                  <div key={item.userId || item.rank} className="space-y-2">
                    <div
                      onClick={() => {
                        if (isAdmin) {
                          if (isSelected) {
                            setSelectedAdminUser(null);
                          } else {
                            setSelectedAdminUser(item);
                            setAdminPoints(item.points || 0);
                            setAdminRole(item.role || 'USER');
                          }
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl bg-[#0A0D14] border text-xs transition ${
                        isAdmin ? 'cursor-pointer hover:border-[#273141]' : 'border-[#1C232E]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          item.rank === 1 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          #{item.rank}
                        </span>
                        <img
                          src={item.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
                          alt={item.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {item.role === 'ADMIN' && (
                              <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 rounded font-bold">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {item.winRate} WR • {item.points} pts
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-emerald-400">
                          {item.pnl}
                        </div>
                        {isAdmin && (
                          <div className="text-[9px] text-blue-400 hover:underline mt-0.5 font-bold">
                            {isSelected ? 'Close' : 'Adjust'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inline Admin Controls Panel */}
                    {isSelected && (
                      <div className="p-3 rounded-xl border border-blue-900/40 bg-blue-950/20 space-y-3 text-xs">
                        <p className="font-bold text-blue-400 text-[10px] uppercase tracking-wider">
                          Admin Panel: {item.name}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] text-slate-400 mb-1 font-bold">POINTS</label>
                            <input
                              type="number"
                              value={adminPoints}
                              onChange={(e) => setAdminPoints(Number(e.target.value))}
                              className="w-full bg-[#0A0D14] border border-slate-850 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 mb-1 font-bold">ROLE</label>
                            <select
                              value={adminRole}
                              onChange={(e) => setAdminRole(e.target.value)}
                              className="w-full bg-[#0A0D14] border border-slate-850 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                            >
                              <option value="USER">USER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-1">
                          <button
                            type="button"
                            disabled={isAdminSubmitting}
                            onClick={async () => {
                              setIsAdminSubmitting(true);
                              try {
                                await updateUserPointsAdmin(item.userId, adminPoints, 'Leaderboard Manual Update');
                                if (adminRole !== item.role) {
                                  await updateUserRoleAdmin(item.userId, adminRole, 'Leaderboard Manual Update');
                                }
                                setSelectedAdminUser(null);
                              } catch {
                                // toast handled in provider
                              } finally {
                                setIsAdminSubmitting(false);
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition"
                          >
                            {isAdminSubmitting ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
