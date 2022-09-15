module.exports = (req, res) => {
  const { params: { category, name } = {} } = req;

  if (category === 'story' && name === '红楼梦') {
    return {
      "id": 1,
      "category": "story",
      "name": "红楼梦"
    }
  } else {
    // ...
  }
}