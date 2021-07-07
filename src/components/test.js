// import React from "react"
// import styled from "@emotion/styled"
// import PropTypes from "prop-types"
// import { StaticQuery, useStaticQuery } from "gatsby"
// import { graphql } from "gatsby"

// const TestBox = styled.span`
//   margin: 0px;
// `

// export function Test({ param }) {
//   return <TestBox>{param}</TestBox>
// }

// Test.defaultProps = {
//   param: `default params`,
// }

// Test.propTypes = {
//   param: PropTypes.string,
// }

// export const StaticQueryDemo = () => (
//   <StaticQuery
//     query={graphql`
//       {
//         site {
//           siteMetadata {
//             title
//           }
//         }
//       }
//     `}
//     render={(data) => (
//       <h1>
//         Querying title from StaticQueryDemo with StaticQuery:
//         {data.site.siteMetadata.title}
//       </h1>
//     )}
//   />
// )

// export const StaticQueryHookDemo = () => {
//     const data = useStaticQuery(graphql`
//       {
//         site {
//           siteMetadata {
//             title
//           }
//         }
//       }
//     `)

//   return (
//     <h1>
//       Querying title from StaticQueryHookDemo with StaticQuery:
//       {data.site.siteMetadata.title}
//     </h1>
//   )
// }

// const PageQueryDemo = ({ data }) => <pre>{JSON.stringify(data, null, 4)}</pre>

// export default PageQueryDemo

// export const query = graphql`
//   {
//     site {
//       siteMetadata {
//         title
//       }
//     }
//   }
// `
