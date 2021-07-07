import React from "react"
import styled from "@emotion/styled"
import Layout from "../components/layout"
import Seo from "../components/seo"

const AboutContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  height: 78vh;
  margin-bottom: 1.45rem;
`

const AboutMe = styled.div`
  font-size: 22px;
  min-width: 100px;
`

const BlockQuote = styled.blockquote`
  & {
    border-left: 10px solid #ccc;
    margin: 1.5em 10px;
    padding: 0.5em 10px;
    max-height: 510px;
    overflow: scroll;
  }
  &:before {
    color: #ccc;
    content: open-quote;
    font-size: 4em;
    line-height: 0.1em;
    margin-right: 0.25em;
    vertical-align: -0.4em;
  }
  & p {
    display: inline;
  }
`

const IndexPage = () => (
  <Layout>
    <Seo
      title="About"
      keywords={[`gatsby`, `lester lee`, `devops`, `back-end`, `full-stack`]}
    />
    <AboutContainer>
      <AboutMe>一个半路出家的编程爱好者，喜欢折腾。</AboutMe>
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
