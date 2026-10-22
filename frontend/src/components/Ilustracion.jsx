import { useId } from 'react';

/** Paisaje del amanecer con colinas y un camino (decorativo). */
export default function Ilustracion({ className, variante = 'completa' }) {
  const recortada = variante === 'esquina';
  const idCielo = `cielo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  if (variante === 'bienvenida') {
    return (
      <svg className={className} viewBox="0 0 480 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={idCielo} x1="0" y1="0" x2="0.25" y2="1">
            <stop stopColor="var(--horizonte-cielo)" />
            <stop offset="0.75" stopColor="var(--horizonte-amanecer)" />
          </linearGradient>
          <radialGradient id={`${idCielo}-halo`}>
            <stop stopColor="#f5c66d" stopOpacity="0.34" />
            <stop offset="0.5" stopColor="#f5c66d" stopOpacity="0.14" />
            <stop offset="1" stopColor="#f5c66d" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${idCielo}-sol`} x1="0" y1="0" x2="0.3" y2="1">
            <stop stopColor="#ffe5ac" />
            <stop offset="1" stopColor="#f1ad42" />
          </linearGradient>
          <linearGradient id={`${idCielo}-camino`} x1="0.7" y1="0" x2="0.25" y2="1">
            <stop stopColor="var(--horizonte-camino-luz)" />
            <stop offset="1" stopColor="var(--horizonte-camino)" />
          </linearGradient>
        </defs>
        <rect width="480" height="620" fill={`url(#${idCielo})`} />
        <circle cx="302" cy="272" r="172" fill={`url(#${idCielo}-halo)`} />
        <circle cx="302" cy="272" r="62" fill={`url(#${idCielo}-sol)`} />
        <g fill="var(--horizonte-bruma)" opacity="0.28">
          <path d="M90 221C114 216 127 219 143 218C160 210 175 212 188 218C207 216 220 220 239 222C195 227 135 226 90 221Z" />
          <path d="M337 283C354 277 366 280 381 278C392 274 406 275 419 279C435 277 453 279 472 284C432 288 379 288 337 283Z" />
        </g>
        <g fill="none" stroke="var(--horizonte-hoja)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5">
          <path d="M339 171Q345 165 351 171Q357 164 363 169M374 190Q378 186 383 190Q387 185 392 188" />
        </g>

        {/* Encuadre vertical: el sendero permanece visible también en móvil. */}
        <path d="M0 329C48 315 76 300 112 308L154 288L184 304L221 298C267 316 329 314 381 308S447 308 480 303V620H0Z" fill="var(--horizonte-lejos)" />
        <path d="M0 360C81 330 116 351 190 333S313 336 382 326S442 330 480 321V620H0Z" fill="var(--horizonte-fondo)" />
        <path d="M0 400C76 368 134 389 213 361S346 370 414 350S452 355 480 344V620H0Z" fill="var(--horizonte-medio)" />
        <path d="M0 446C91 409 138 435 210 405S342 403 411 388S456 387 480 376V620H0Z" fill="var(--horizonte-frente)" />
        <path d="M0 506C81 469 139 492 206 463S332 456 403 443S450 444 480 425V620H0Z" fill="var(--horizonte-cerca)" />
        <g fill="none" stroke="var(--horizonte-pradera)" strokeWidth="1.3" strokeLinecap="round" opacity="0.4">
          <path d="M46 389Q90 378 135 380M316 370Q358 363 393 364M325 435Q367 424 414 425M56 484Q103 473 139 476" />
        </g>
        <path d="M102 620C116 561 260 526 272 484C283 449 190 440 210 410C226 386 278 365 309 346C288 369 247 392 242 410C235 430 325 442 309 480C288 532 216 569 219 620Z" fill={`url(#${idCielo}-camino)`} />
        <path d="M0 560C46 532 92 548 128 535L87 620H0ZM480 494C427 481 378 504 351 532L311 620H480Z" fill="var(--horizonte-hoja)" />

        <g fill="var(--horizonte-hoja)">
          <path d="M403 470C409 427 408 380 399 344C411 375 416 426 413 471Z" />
          <path d="M401 348C376 324 352 335 345 359C364 344 382 341 401 348ZM401 348C376 344 363 363 366 384C376 366 386 354 401 348ZM400 348C388 322 397 303 416 294C405 314 402 330 400 348ZM402 348C423 322 447 331 459 351C439 341 422 340 402 348ZM402 349C428 346 440 366 435 389C426 366 417 357 402 349Z" />
          <path d="M458 411C462 386 460 357 454 332C463 356 468 385 466 412Z" />
          <path d="M455 335C438 318 422 328 417 343C430 334 443 331 455 335ZM455 335C446 316 452 302 465 296C457 310 456 323 455 335ZM455 335C470 315 489 323 495 338C479 331 468 331 455 335ZM455 335C472 333 482 348 479 365C472 347 465 340 455 335Z" />
          <path d="M31 583Q34 544 16 519Q40 540 42 565Q45 529 60 509Q49 546 52 571Q63 550 82 541Q61 567 59 594ZM379 553Q378 527 362 508Q381 519 386 540Q388 507 403 487Q392 525 398 551Z" />
        </g>
        <g fill="none" stroke="var(--horizonte-pradera)" strokeWidth="1.6" strokeLinecap="round" opacity="0.55">
          <path d="M340 533L337 518M346 532L350 523M79 528L76 515M85 527L89 519M423 492L421 478M429 491L433 483" />
        </g>
      </svg>
    );
  }
  if (variante === 'horizonte') {
    return (
      <svg className={className} viewBox="0 0 900 500" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={idCielo} x1="0" y1="0" x2="0.15" y2="1">
            <stop stopColor="var(--horizonte-cielo)" />
            <stop offset="1" stopColor="var(--horizonte-amanecer)" />
          </linearGradient>
          <radialGradient id={`${idCielo}-halo`}>
            <stop stopColor="#f5c66d" stopOpacity="0.32" />
            <stop offset="0.5" stopColor="#f5c66d" stopOpacity="0.13" />
            <stop offset="1" stopColor="#f5c66d" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${idCielo}-sol`} x1="0" y1="0" x2="0.3" y2="1">
            <stop stopColor="#ffe1a0" />
            <stop offset="1" stopColor="#f1ad42" />
          </linearGradient>
          <linearGradient id={`${idCielo}-camino`} x1="0.7" y1="0" x2="0.3" y2="1">
            <stop stopColor="var(--horizonte-camino-luz)" />
            <stop offset="1" stopColor="var(--horizonte-camino)" />
          </linearGradient>
        </defs>

        {/* Luz del amanecer: el sol se oculta parcialmente detrás del horizonte. */}
        <path d="M0 86C190 66 253 108 417 73S727 59 900 20V500H0Z" fill={`url(#${idCielo})`} />
        <circle cx="662" cy="226" r="180" fill={`url(#${idCielo}-halo)`} />
        <circle cx="662" cy="226" r="56" fill={`url(#${idCielo}-sol)`} />
        <g fill="var(--horizonte-bruma)">
          <path d="M475 189C506 182 523 186 542 188C558 180 579 181 597 187C616 186 631 188 645 191C591 196 528 196 475 189Z" opacity="0.22" />
          <path d="M713 238C739 234 751 237 769 235C783 230 800 231 813 235C841 232 865 235 890 239C833 243 766 244 713 238Z" opacity="0.28" />
        </g>
        <g fill="none" stroke="var(--horizonte-hoja)" strokeWidth="1.8" strokeLinecap="round" opacity="0.55">
          <path d="M745 160Q751 154 757 160Q763 153 769 158M785 179Q789 175 794 179Q798 174 803 177" />
        </g>

        {/* Relieves lejanos, sabana abierta y manchas de vegetación. */}
        <path d="M0 300L94 281L144 286L215 258L252 268L309 250L360 271L415 265C502 279 558 273 615 274S791 259 900 267V500H0Z" fill="var(--horizonte-lejos)" />
        <path d="M0 327C134 292 225 321 357 298S528 300 653 286S795 289 900 278V500H0Z" fill="var(--horizonte-fondo)" />
        <path d="M0 356C139 323 244 356 376 323S532 335 656 311S804 319 900 303V500H0Z" fill="var(--horizonte-medio)" />
        <path d="M0 391C142 354 226 394 373 360S538 350 653 342S801 352 900 326V500H0Z" fill="var(--horizonte-frente)" />
        <g fill="var(--horizonte-hoja)" opacity="0.45">
          <path d="M733 318Q737 307 742 315Q745 302 751 312Q756 297 761 311Q766 304 771 314Q778 306 783 318Z" />
          <path d="M426 330Q430 322 435 326Q439 315 445 325Q451 318 457 329Z" />
        </g>
        <path d="M0 438C150 389 244 442 390 410S550 372 676 397S809 390 900 366V500H0Z" fill="var(--horizonte-cerca)" />
        <g fill="none" stroke="var(--horizonte-pradera)" strokeWidth="1.3" strokeLinecap="round" opacity="0.4">
          <path d="M498 321Q548 314 592 317M687 329Q739 325 787 330M297 388Q366 379 421 379M691 413Q754 402 810 405" />
        </g>

        {/* La cinta se estrecha hasta perderse en el horizonte. */}
        <path d="M328 500C382 458 543 431 591 395C631 366 552 359 590 333C614 317 645 306 670 298C652 310 634 320 620 332C595 353 666 362 642 391C612 429 506 461 471 500Z" fill={`url(#${idCielo}-camino)`} />
        <path d="M0 478C131 434 229 468 313 458L246 500H0ZM900 434C805 418 725 437 670 462L630 500H900Z" fill="var(--horizonte-hoja)" />

        {/* Palmas y pastos del primer plano: detalles discretos del Llano. */}
        <g fill="var(--horizonte-hoja)">
          <path d="M822 403C826 361 823 322 816 288C827 321 832 361 831 403Z" />
          <path d="M817 291C792 270 773 280 766 304C782 289 798 286 817 291ZM817 291C794 288 782 304 783 323C792 305 805 295 817 291ZM816 291C805 267 815 253 832 246C820 263 818 276 816 291ZM818 291C836 268 858 276 868 292C850 285 835 284 818 291ZM818 292C841 289 852 305 850 325C842 306 831 298 818 292Z" />
          <path d="M877 364C879 335 877 308 873 282C880 307 884 337 883 364Z" />
          <path d="M874 284C855 270 842 280 840 295C851 284 862 281 874 284ZM874 284C864 265 870 254 881 247C875 263 874 273 874 284ZM874 284C889 266 904 273 911 286C897 280 886 280 874 284ZM874 284C890 284 896 298 892 312C886 297 882 290 874 284Z" />
          <path d="M795 500Q796 462 778 441Q799 454 803 479Q804 445 817 427Q808 462 812 483Q824 459 842 453Q819 477 818 500ZM854 500Q855 476 843 463Q859 470 862 487Q865 457 878 443Q869 475 872 500Z" />
        </g>
        <g fill="none" stroke="var(--horizonte-pradera)" strokeWidth="1.5" strokeLinecap="round" opacity="0.55">
          <path d="M703 463L701 451M708 462L712 453M744 475L743 461M749 474L753 465M259 470L256 460M264 469L268 461" />
        </g>
      </svg>
    );
  }
  return (
    <svg
      className={className}
      viewBox={recortada ? '120 0 280 260' : '0 0 400 320'}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={idCielo} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBE7C2" />
          <stop offset="1" stopColor="#F8F6F0" />
        </linearGradient>
      </defs>
      <rect width="400" height="320" fill={`url(#${idCielo})`} />
      <circle cx="268" cy="118" r="44" fill="#F2A93B" opacity="0.9" />
      <path d="M0 190 C 80 150 150 170 220 150 S 340 120 400 140 V 320 H 0 Z" fill="#7DB88F" />
      <path d="M0 230 C 90 200 170 220 250 196 S 360 180 400 196 V 320 H 0 Z" fill="#2E7D64" />
      <path d="M0 270 C 100 250 200 266 290 246 S 380 240 400 250 V 320 H 0 Z" fill="#164F3B" />
      <path
        d="M168 320 C 190 290 236 278 240 258 C 244 238 214 226 236 206 C 252 192 278 190 290 186"
        stroke="#F8F6F0"
        strokeWidth="16"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
    </svg>
  );
}
