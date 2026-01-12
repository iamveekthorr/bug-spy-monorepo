interface CardProps {
  image: string;
  digit: string;
  title: string;
  subTitle: string;
  altText: string;
}

const HowItWorksCard = (props: CardProps) => (
  <div className="bg-blue-700/5 rounded-xl py-6 md:py-8 lg:py-12 px-4 md:px-6 lg:px-10">
    <p className="rounded-xl bg-white text-slate-900 font-bold text-lg md:text-xl lg:text-2xl max-w-fit py-2 md:py-3 px-3 md:px-4">
      {props.digit}
    </p>
    <div className="mt-2 mb-4 md:mb-6 lg:mb-7">
      <h4 className="text-lg md:text-xl lg:text-2xl font-bold mb-1 md:mb-2">{props.title}</h4>
      <p className="text-sm md:text-base">{props.subTitle}</p>
    </div>
    <div className="aspect-[16/9] overflow-hidden rounded-xl">
      <img
        src={props.image}
        alt={props.altText || ''}
        className="w-full h-full object-cover"
      />
    </div>
  </div>
);

export default HowItWorksCard;
