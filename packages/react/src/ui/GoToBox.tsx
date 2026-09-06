import { useRef, useState, type FormEvent } from 'react';
import {
  geocode,
  parseLatLon,
  rangeForBoundingBox,
  type CameraTarget,
  type GeocodeOptions,
  type GeocodeResult,
} from 'worldwind-kit';
import { useGlobe } from '../context';
import { Panel, type PanelPosition } from './Panel';

/** @category Widgets */
export interface GoToBoxProps {
  position?: PanelPosition;
  heading?: string | null;
  placeholder?: string;
  /** Flight duration in ms. Default 2000. */
  duration?: number;
  /** Range used when a result has no bounding box, or for typed coordinates. Default 200 km. */
  defaultRange?: number;
  /** Options for place-name search, or `false` to accept coordinates only. */
  geocoding?: GeocodeOptions | false;
  onNavigate?: (target: CameraTarget, result?: GeocodeResult) => void;
  className?: string;
}

type Status = { kind: 'idle' } | { kind: 'searching' } | { kind: 'empty' } | { kind: 'error'; message: string };

/** A search box: type `lat, lon` or a place name and fly there.
 * @category Widgets
 */
export function GoToBox({
  position = 'top-left',
  heading = 'Go to',
  placeholder = 'City or "lat, lon"',
  duration = 2000,
  defaultRange = 200_000,
  geocoding = {},
  onNavigate,
  className,
}: GoToBoxProps) {
  const globe = useGlobe();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const request = useRef(0);

  const navigate = (target: CameraTarget, result?: GeocodeResult) => {
    setResults([]);
    setStatus({ kind: 'idle' });
    onNavigate?.(target, result);
    void globe.camera.goTo(target, { duration });
  };

  const choose = (result: GeocodeResult) => {
    navigate(
      {
        latitude: result.latitude,
        longitude: result.longitude,
        range: result.boundingBox ? rangeForBoundingBox(result.boundingBox) : defaultRange,
      },
      result,
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const coordinates = parseLatLon(query);
    if (coordinates) {
      navigate({ ...coordinates, range: defaultRange });
      return;
    }
    if (geocoding === false || !query.trim()) return;
    const id = ++request.current;
    setStatus({ kind: 'searching' });
    try {
      const found = await geocode(query, geocoding);
      if (id !== request.current) return;
      if (found.length === 0) {
        setResults([]);
        setStatus({ kind: 'empty' });
      } else if (found.length === 1) {
        choose(found[0]!);
      } else {
        setResults(found);
        setStatus({ kind: 'idle' });
      }
    } catch (error) {
      if (id !== request.current) return;
      setResults([]);
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <Panel position={position} heading={heading} className={className}>
      <form className="wwui-goto" onSubmit={(event) => void submit(event)} role="search">
        <div className="wwui-goto__row">
          <input
            className="wwui-goto__input"
            type="search"
            value={query}
            placeholder={placeholder}
            aria-label="Go to location"
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" className="wwui-button wwui-goto__submit" disabled={status.kind === 'searching'}>
            Go
          </button>
        </div>
        {status.kind === 'searching' ? <div className="wwui-goto__status">Searching…</div> : null}
        {status.kind === 'empty' ? <div className="wwui-goto__status">No results</div> : null}
        {status.kind === 'error' ? (
          <div className="wwui-goto__status" role="alert">
            {status.message}
          </div>
        ) : null}
        {results.length > 0 ? (
          <ul className="wwui-goto__results">
            {results.map((result, index) => (
              <li key={index}>
                <button type="button" className="wwui-goto__result" onClick={() => choose(result)}>
                  {result.displayName}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </form>
    </Panel>
  );
}
