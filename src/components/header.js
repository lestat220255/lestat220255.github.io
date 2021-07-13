import { Link } from "gatsby"
import styled from "@emotion/styled"
import PropTypes from "prop-types"
import React from "react"
// import search component
import Search from "./search"
const searchIndices = [{ name: `blogs`, title: `blogs` }]

const Content = styled.div`
  max-width: 860px;
  padding: 1rem 1.0875rem;
  font-size: 1.2rem;
  height: 10vh;
  max-height: 10vh;
`

const NavContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  width: 267px;
  max-width: 267px;
  margin: 0 auto;
`

const NavLink = styled(Link)`
  font-weight: 800;
  color: black;
  margin-left: 15px;
  text-decoration: none;
  display: inline-block;
  position: relative;

  ::after {
    content: "";
    position: absolute;
    width: 100%;
    transform: scaleX(0);
    height: 2px;
    bottom: 0;
    left: 0;
    background-color: rgba(0, 0, 0, 0.8);
    transform-origin: bottom right;
    transition: transform 0.4s cubic-bezier(0.86, 0, 0.07, 1);
  }

  :hover::after {
    transform: scaleX(1);
    transform-origin: bottom left;
  }
`

const HomeLink = styled(NavLink)`
  margin-left: 0;
`

const SiteHeader = styled.header`
  background: transparent;
  display: flex;
  align-content: center;
  justify-content: center;
`

const Divider = styled.hr`
  width: 265px;
  max-width: 265px;
  margin: 1vh auto -0.3vh auto;
`

const Header = ({ siteTitle }) => (
  <SiteHeader>
    <Content>
      <NavContainer>
        <HomeLink to="/">Home</HomeLink>
        <NavLink to="/blog">Blog</NavLink>
        <NavLink to="/tags">Tags</NavLink>
        <NavLink to="/about">About</NavLink>
      </NavContainer>
      <Divider />
      <Search indices={searchIndices} />
    </Content>
  </SiteHeader>
)

Header.propTypes = {
  siteTitle: PropTypes.string,
}

Header.defaultProps = {
  siteTitle: ``,
}

export default Header
