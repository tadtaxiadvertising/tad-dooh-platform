/** Original vector storyboards, intentionally illustrative and network-free. */
export default function StoryChapterArt({ chapter }: { chapter: number }) {
  return (
    <svg
      viewBox="0 0 480 240"
      width="480"
      height="240"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="480" height="240" rx="16" fill="#141819" />
      {chapter === 0 ? (
        <>
          <circle cx="368" cy="66" r="42" fill="#FDCB01" />
          <path
            d="M0 143V88h50V68h42v47h37V42h59v81h38V82h51v48h44V98h56v45h103v97H0Z"
            fill="#343D40"
          />
          <path d="M0 185 480 149v91H0Z" fill="#22282B" />
          <path
            d="m0 215 480-35"
            stroke="#B7B8AC"
            strokeWidth="3"
            strokeDasharray="20 24"
          />
          <path
            d="M83 157h32l34-42h123l52 42h49q20 0 20 24v18H67v-18q0-24 16-24Z"
            fill="#FDCB01"
            stroke="#977600"
            strokeWidth="3"
          />
          <path d="m130 155 30-30h101l39 30Z" fill="#24343A" />
          <path d="M212 125v30" stroke="#E6B600" strokeWidth="4" />
          <rect x="185" y="103" width="49" height="13" rx="4" fill="#F8F4DE" />
          <circle cx="136" cy="199" r="22" fill="#121416" />
          <circle cx="136" cy="199" r="10" fill="#889194" />
          <circle cx="325" cy="199" r="22" fill="#121416" />
          <circle cx="325" cy="199" r="10" fill="#889194" />
        </>
      ) : chapter === 1 ? (
        <>
          <rect x="21" y="17" width="438" height="131" rx="36" fill="#38545E" />
          <path
            d="M25 112V70h49v35h46V52h56v58h57V77h69v34h52V61h43v48h62v35H25Z"
            fill="#26363C"
          />
          <rect
            x="161"
            y="81"
            width="273"
            height="184"
            rx="59"
            fill="#3D4345"
          />
          <rect
            x="222"
            y="24"
            width="153"
            height="115"
            rx="31"
            fill="#50585B"
          />
          <path d="M0 240v-58q45-39 110-8l36 66Z" fill="#222729" />
          <ellipse cx="54" cy="139" rx="38" ry="46" fill="#302C28" />
          <rect
            x="195"
            y="67"
            width="211"
            height="133"
            rx="14"
            fill="#080A0C"
            stroke="#8B9394"
            strokeWidth="3"
          />
          <rect x="205" y="77" width="191" height="113" rx="6" fill="#FDCB01" />
          <path
            d="M221 94h80v8h-80zm0 18h105v12H221zm0 20h66v9h-66z"
            fill="#171717"
          />
          <rect x="346" y="139" width="35" height="35" rx="4" fill="#FFF" />
          <path
            d="M352 145h9v9h-9zm14 0h9v9h-9zm-14 14h9v9h-9zm14 0h4v4h-4zm5 5h4v4h-4z"
            fill="#171717"
          />
          <path d="M221 165h74" stroke="#171717" strokeWidth="4" />
        </>
      ) : (
        <>
          <rect x="61" y="25" width="358" height="190" rx="15" fill="#F8F8F4" />
          <path d="M61 67h358" stroke="#D5D8D2" strokeWidth="2" />
          <rect x="79" y="39" width="45" height="13" rx="3" fill="#202526" />
          <circle cx="132" cy="49" r="4" fill="#FDCB01" />
          <path d="M79 87h147v9H79zm0 17h95v5H79z" fill="#555D5A" />
          {[0, 1, 2].map((index) => (
            <g key={index} transform={`translate(${79 + index * 111} 129)`}>
              <rect width="100" height="62" rx="8" fill="#E8EAE4" />
              <circle cx="18" cy="18" r="9" fill="#FDCB01" />
              <path
                d="m14 18 3 3 6-7"
                fill="none"
                stroke="#171717"
                strokeWidth="2"
              />
              <path d="M13 38h70v5H13zm0 10h47v4H13z" fill="#69706C" />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
