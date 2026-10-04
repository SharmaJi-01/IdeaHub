function serializeIdea(idea, userState = {}) {
  const item = { ...idea };
  delete item.creatorId;
  return {
    ...item,
    id: String(item.id || item._id),
    creator: item.creator ? {
      id: String(item.creator.id || item.creator._id),
      name: item.creator.name,
      username: item.creator.username,
      avatar: item.creator.avatarUrl || '',
      verificationStatus: item.creator.verificationStatus,
      collegeName: item.creator.collegeName,
    } : null,
    liked: Boolean(userState.liked),
    saved: Boolean(userState.saved),
  };
}

module.exports = { serializeIdea };
