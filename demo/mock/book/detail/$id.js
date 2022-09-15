module.exports = (req, res) => {
  const { params: { id } = {} } = req;

  if (id == 1) {
    return {
      "id": 1,
      "category": "story",
      "name": "红楼梦"
    }
  } else {
    // ...
  }
}