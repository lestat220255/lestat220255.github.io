/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/node-apis/
 */

// You can delete this file if you're not using it

/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/node-apis/
 */

// You can delete this file if you're not using it

const path = require(`path`)
const { createFilePath } = require(`gatsby-source-filesystem`)

exports.onCreateNode = ({ node, getNode, actions }) => {
  const { createNodeField } = actions
  if (node.internal.type === `MarkdownRemark`) {
    const slug = createFilePath({ node, getNode, basePath: `pages` })
    createNodeField({
      node,
      name: `slug`,
      value: slug,
    })
  }
}

exports.createPages = ({ graphql, actions }) => {
  const { createPage } = actions
  const blogPostTemplate = path.resolve(`src/templates/blog-post.js`)
  // below for pagination
  const blogPostList = path.resolve("src/templates/blog.js")
  return graphql(`
    {
      allMarkdownRemark {
        edges {
          node {
            frontmatter {
              path
              draft
              date
              title
            }
            fields {
              slug
            }
          }
        }
      }
    }
  `).then((result) => {
    if (result.errors) {
      return Promise.reject(result.errors)
    }

    const posts = result.data.allMarkdownRemark.edges

    // following codes are added by Kinniku
    // because posts.length returns the number of "posts" plus "pages", posts.length can not be used to calculate number of pages
    // therefore, we need to use "count" which counts only the number of items includes the link '/posts'
    let count = 0
    posts.forEach((post) => {
      // console.log(post.node.fields.slug)
      count = count + 1
    })

    // Create list of posts pages
    // https://www.gatsbyjs.org/docs/adding-pagination/
    const postsPerPage = 6

    // posts.length was replaced with count
    let numPages = Math.ceil(count / postsPerPage)

    Array.from({ length: numPages }).forEach((_, index) => {
      const withPrefix = (pageNumber) =>
        pageNumber === 1 ? `/blog` : `/blog/${pageNumber}`
      const pageNumber = index + 1
      createPage({
        path: withPrefix(pageNumber),
        component: blogPostList,
        context: {
          limit: postsPerPage,
          skip: index * postsPerPage,
          current: pageNumber,
          total: numPages,
          hasNext: pageNumber < numPages,
          nextPath: withPrefix(pageNumber + 1),
          hasPrev: index > 0,
          prevPath: withPrefix(pageNumber - 1),
        },
      })
    })

    // Create blog posts pages.
    posts.forEach((post, index) => {
      const previous = index === posts.length - 1 ? null : posts[index + 1].node
      const next = index === 0 ? null : posts[index - 1].node
      createPage({
        path: post.node.frontmatter.path,
        component: blogPostTemplate,
        context: {
          slug: post.node.fields.slug,
          previous,
          next,
        },
      })
    })
  })
}
