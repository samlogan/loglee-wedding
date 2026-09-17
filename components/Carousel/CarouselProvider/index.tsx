import type { UseEmblaCarouselType } from 'embla-carousel-react';
import { createContext, useState, useContext } from 'react';
import type { FC, ReactNode } from 'react';

type CarouselType = UseEmblaCarouselType[1] & {
  scrollPrevAllowed: boolean;
  scrollNextAllowed: boolean;
  progress: number;
};

interface CarouselContextType {
  carousel: CarouselType | undefined;
  setCarousel: (carousel: CarouselType | undefined) => void;
}

export const CarouselContext = createContext<CarouselContextType>({
  carousel: undefined,
  setCarousel: () => {}
});

interface CarouselProviderProps {
  children: ReactNode;
}

const CarouselProvider: FC<CarouselProviderProps> = (props) => {
  const { children } = props;
  const [carousel, setCarousel] = useState<CarouselType | undefined>();

  return <CarouselContext.Provider value={{ carousel, setCarousel }}>{children}</CarouselContext.Provider>;
};

export const useCarouselContext = () => useContext(CarouselContext);

export default CarouselProvider;
