import styled, { css } from "styled-components"
import SearchBox from "./search-box"

const open = css`
  width: 8em;
  background: ${({ theme }) => theme.background};
  cursor: text;
  margin-left: -1.2em;
  padding-left: 1.5em;
`

const closed = css`
  width: 0;
  background: transparent;
  cursor: pointer;
  margin-left: -1em;
  padding-left: 1em;
`

export default styled(SearchBox)`
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  margin-bottom: 0;
  margin-left: 15px;

  .SearchInput {
    outline: none;
    border: ${({ hasFocus }) => (hasFocus ? "auto" : "none")};
    font-size: 1em;
    transition: 100ms;
    border-radius: 2px;
    color: ${({ theme }) => theme.foreground};
    ::placeholder {
      color: ${({ theme }) => theme.faded};
    }
    ${({ hasFocus }) => (hasFocus ? open : closed)}
  }

  .SearchIcon {
    width: 1em;
    margin: 0.3em;
    color: ${({ theme }) => theme.foreground};
    pointer-events: none;
  }
`