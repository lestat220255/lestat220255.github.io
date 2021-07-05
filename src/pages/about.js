import React from "react"
import styled from "@emotion/styled"
import Layout from "../components/layout"
import SEO from "../components/seo"

const AboutContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  height: 78vh;
`

const IndexPage = () => (
  <Layout>
    <SEO title="About" keywords={[`gatsby`, `lester lee`, `devops`, `back-end`, `full-stack`]} />
    <AboutContainer>
    Nothing is everything.
    </AboutContainer>
  </Layout>
)

export default IndexPage
