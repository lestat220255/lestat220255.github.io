import React from "react"
import PropTypes from "prop-types"
import Seo from "../components/seo"
import styled from "@emotion/styled"
import Layout from "../components/layout"

// Utilities
import kebabCase from "lodash/kebabCase"

// Components
import { Link, graphql } from "gatsby"

const Content = styled.div`
  margin: 0 auto;
  max-width: 860px;
  padding: 1.45rem 1.0875rem;
`

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
`

const TagContainer = styled.div`
  margin: 10px 5px;
  padding: 3px;
  font-size: 20px;
  border-radius: 8px;
  & > a {
    text-decoration: none;
  }
  & :before {
    content: "🏷️";
  }
  &:hover {
    box-shadow: 0 0.5em 1em -0.125em rgb(10 10 10 / 10%),
      0 0 0 1px rgb(10 10 10 / 2%);
  }
`

const TagsPage = ({
  data: {
    allMarkdownRemark: { group },
    site: {
      siteMetadata: { title },
    },
  },
}) => (
  <Layout>
    <Seo title="Tags" description="Tags" />
    <Content>
      <h1>Tags</h1>
      <TagsContainer>
        {group.map((tag) => (
          <TagContainer key={tag.fieldValue}>
            <Link to={`/tags/${kebabCase(tag.fieldValue)}/`}>
              {tag.fieldValue} ({tag.totalCount})
            </Link>
          </TagContainer>
        ))}
      </TagsContainer>
    </Content>
  </Layout>
)

TagsPage.propTypes = {
  data: PropTypes.shape({
    allMarkdownRemark: PropTypes.shape({
      group: PropTypes.arrayOf(
        PropTypes.shape({
          fieldValue: PropTypes.string.isRequired,
          totalCount: PropTypes.number.isRequired,
        }).isRequired
      ),
    }),
    site: PropTypes.shape({
      siteMetadata: PropTypes.shape({
        title: PropTypes.string.isRequired,
      }),
    }),
  }),
}

export default TagsPage

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(limit: 2000) {
      group(field: frontmatter___tags) {
        fieldValue
        totalCount
      }
    }
  }
`
