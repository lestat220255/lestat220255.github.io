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

const BlockQuote = styled.blockquote`
  & {
    background: #f9f9f9;
    border-left: 10px solid #ccc;
    margin: 1.5em 10px;
    padding: 0.5em 10px;
    quotes: "\201C""\201D""\2018""\2019";
  }

`

const IndexPage = () => (
  <Layout>
    <SEO
      title="About"
      keywords={[`gatsby`, `lester lee`, `devops`, `back-end`, `full-stack`]}
    />
    <AboutContainer>
      <BlockQuote>
        At some point, everything is going to go south on you. Everything is
        going to go south and you're going to say, "This is it. "This is how I
        end." Now, you can either accept that or you can get to work. That's all
        it is. You just begin. You do the math. You solve one problem then you
        solve the next one. And then the next. And if you solve enough problems,
        you get to come home.
      </BlockQuote>
    </AboutContainer>
  </Layout>
)

export default IndexPage
