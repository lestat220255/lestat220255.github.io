// React version: "^16.12.0"
import React from "react"
import words from "./words"
import Typed from "typed.js"
import styled from "@emotion/styled"

const TypedBox = styled.span`
  margin-left: 5px;
`

class Typing extends React.Component {
  componentDidMount() {
    const options = {
      strings: words,
      typeSpeed: 75,
      backSpeed: 50,
      loop: false,
      cursorChar: "|",
    }
    // this.el refers to the <span> in the render() method
    this.typed = new Typed(this.el, options)
  }
  componentWillUnmount() {
    // Please don't forget to cleanup animation layer
    this.typed.destroy()
  }

  render() {
    return (
      <TypedBox
        style={{ whiteSpace: "pre" }}
        ref={(el) => {
          this.el = el
        }}
      />
    )
  }
}
export default Typing
