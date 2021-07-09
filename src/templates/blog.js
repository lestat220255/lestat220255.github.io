import React from "react"
import { Link, graphql } from "gatsby"
import { css } from "@emotion/core"
import styled from "@emotion/styled"
import Layout from "../components/layout"
import Seo from "../components/seo"

const Content = styled.div`
  margin: 0 auto;
  max-width: 860px;
  padding: 1.45rem 1.0875rem;
`

const ArticleDate = styled.h5`
  display: inline;
  color: #606060;
`

const MarkerHeader = styled.h3`
  display: inline;
  border-radius: 1em 0 1em 0;
  background-image: linear-gradient(
    -100deg,
    rgba(255, 250, 150, 0.15),
    rgba(255, 250, 150, 0.8) 100%,
    rgba(255, 250, 150, 0.25)
  );
`

const ReadingTime = styled.h5`
  display: inline;
  color: #606060;
`

const PostsContainer = styled.div`
  & {
    padding: 2vh;
    margin: 0 0 3vh 0;
    border-radius: 8px;
    transition: box-shadow 0.5s;
  }

  &:hover {
    box-shadow: 0 0.5em 1em -0.125em rgb(10 10 10 / 10%),
      0 0 0 1px rgb(10 10 10 / 2%);
  }
`

const TagContainer = styled.span`
  margin: 10px 5px;
  font-size: 20px;
  & > a {
    text-decoration: none;
  }
  & :before {
    content: "🏷️";
  }
`

const ItemBottom = styled.div`
  display: flex;
  justify-content: space-between;
`

const ReadMore = styled.button`
  cursor: pointer;
  margin: 10px 5px;
  font-size: 20px;
  background-color: inherit;
  border-color: inherit;
  border-width: 1px;
  border-radius: 5px;
  font-size: 12px;
  white-space: pre;
  font-weight: bold;
  max-height: 27px;
  & > a {
    text-decoration: none;
  }
`

const TagsContainer = styled.span`
  padding: calc(0.5em - 1px) 0;
`

class IndexPage extends React.Component {
  render() {
    const { data } = this.props
    const posts = data.allMarkdownRemark.edges
    const { current, total } = this.props.pageContext
    const isFirst = current === 1
    const isLast = current === total
    const prevPage =
      current - 1 === 1 ? "/blog" : `/blog/` + (current - 1).toString()
    const nextPage = `/blog/` + (current + 1).toString()
    return (
      <Layout>
        <Seo title="Blog" />
        <Content>
          <h1>Blog</h1>
          {posts
            .filter(({ node }) => {
              const rawDate = node.frontmatter.rawDate
              const date = new Date(rawDate)
              return date < new Date()
            })
            .map(({ node }) => (
              <PostsContainer key={node.id}>
                <Link
                  to={node.frontmatter.path}
                  css={css`
                    text-decoration: none;
                    color: inherit;
                  `}
                >
                  <MarkerHeader>{node.frontmatter.title}</MarkerHeader>
                </Link>
                <div>
                  <ArticleDate>{node.frontmatter.date}</ArticleDate>
                  <ReadingTime> - {node.fields.readingTime.text}</ReadingTime>
                </div>
                <p>{node.excerpt}</p>
                <ItemBottom>
                  <TagsContainer>
                    {node.frontmatter.tags.map((tag, key) => {
                      return (
                        <TagContainer key={key}>
                          <Link to={`/tags/` + tag}>{tag}</Link>
                        </TagContainer>
                      )
                    })}
                  </TagsContainer>
                  <ReadMore>
                    <Link to={node.frontmatter.path}>Read More →</Link>
                  </ReadMore>
                </ItemBottom>
              </PostsContainer>
            ))}
        </Content>
        <ul
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            listStyle: "none",
            padding: 0,
          }}
        >
          {!isFirst && (
            <Link to={prevPage} rel="prev">
              ← Previous Page
            </Link>
          )}
          {Array.from({ length: total }, (_, i) => (
            <li
              key={`pagination-number${i + 1}`}
              style={{
                margin: 0,
              }}
            >
              <Link
                to={`/blog/${i === 0 ? "" : i + 1}`}
                style={{
                  textDecoration: "none",
                  background: i + 1 === current ? "rgba(255,250,150,0.8)" : "",
                }}
              >
                {i + 1}
              </Link>
            </li>
          ))}
          {!isLast && (
            <Link to={nextPage} rel="next">
              Next Page →
            </Link>
          )}
        </ul>
      </Layout>
    )
  }
}

export const blogListQuery = graphql`
  query blogListQuery($skip: Int!, $limit: Int!) {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(
      sort: { fields: [frontmatter___date], order: DESC }
      filter: { frontmatter: { draft: { eq: false } } }
      limit: $limit
      skip: $skip
    ) {
      totalCount
      edges {
        node {
          id
          frontmatter {
            tags
            title
            date(formatString: "DD MMMM, YYYY")
            rawDate: date
            path
          }
          fields {
            slug
            readingTime {
              text
            }
          }
          excerpt
        }
      }
    }
  }
`

export default IndexPage
