import bannerImg from "@/assets/Banner.svg"

export function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl w-full group border border-border/50">
      <img
        src={bannerImg}
        alt="Banner Administrativo"
        className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.02]"
      />
    </div>
  )
}
