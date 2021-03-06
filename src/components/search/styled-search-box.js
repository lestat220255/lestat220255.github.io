import styled, { css } from "styled-components"
import SearchBox from "./search-box"

export default styled(SearchBox)`
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  margin: 1vh 0;

  .SearchInput {
    outline: none;
    border: none;
    font-size: 1em;
    transition: 100ms;
    border-radius: 2px;
    color: ${({ theme }) => theme.foreground};
    ::placeholder {
      color: ${({ theme }) => theme.faded};
    }
    width: 100%;
    background: ${({ theme }) => theme.background};
    cursor: text;
    margin-left: -1.2em;
    padding-left: 1.5em;
  }

  .SearchIcon {
    width: 1em;
    margin: 0.3em;
    color: ${({ theme }) => theme.foreground};
    pointer-events: none;
  }
`
