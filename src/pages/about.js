import React from "react"

import LandingBio from "../components/landing-bio"
import Layout from "../components/layout"
import SEO from "../components/seo"

const IndexPage = () => (
  <Layout>
    <SEO title="About" keywords={[`gatsby`, `lester lee`, `devops`, `back-end`, `full-stack`]} />
    <LandingBio />
  </Layout>
)

export default IndexPage
