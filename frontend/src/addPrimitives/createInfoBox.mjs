export function createInfoBox(Info,excludeFields) {
    // Modify this function to use conductorInfo data

    const tableRows = Object.keys(Info)
      .filter((key) => !excludeFields.includes(key))
      .map(
        (key) =>
          `<tr><th>${camelCaseToWords(key)}:</th><td>${
            Info[key]
          }</td></tr>`
      )
      .join("");

    return `
  <table class="cesium-infoBox-defaultTable"><tbody>
  ${tableRows}
  </tbody></table>
  
 `;
  }

  export function camelCaseToWords(str) {
    // Replace underscores with spaces and camelCase with spaces before capital letters
    return (
      str
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
        // Optionally, capitalize the first letter of each word
        .replace(/\b\w/g, (char) => char.toUpperCase())
    );
  }