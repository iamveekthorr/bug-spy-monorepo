interface CardProps {
  image: string;
  digit: string;
  title: string;
  subTitle: string;
  altText: string;
}

const HowItWorksCard = (props: CardProps) => (
  <div className="bg-blue-700/5 rounded-xl py-15 px-10">
    <p className="rounded-xl bg-white text-slate-900 font-bold text-2xl max-w-fit py-3 px-4">
      {props.digit}
    </p>
    <div className="mt-2 mb-7">
      <h4 className="text-2xl font-bold">{props.title}</h4>
      <p>{props.subTitle}</p>
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
